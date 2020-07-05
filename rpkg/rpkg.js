'use strict';

import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import YAML from 'yaml';
import semver from 'semver';
import equal from 'deep-equal';
import child_process from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';
import https from 'https';

var rpkg_config = {
    host_prefix: '/var/lib/rpkg/',
    target_prefix: '/var/lib/rpkg/',
    target_root: '/',
    directory_overrides: {},
    use_default_depends: true,
    confirm: true
};

const PBR_NOISY_DEBUG = false;

const get_host_directory = function (dir) {
    if (rpkg_config.directory_overrides[`host_${dir}`]) {
        return rpkg_config.directory_overrides[`host_${dir}`];
    }
    return path.join(rpkg_config.host_prefix, dir);
}

const get_target_directory = function (dir) {
    if (rpkg_config.directory_overrides[`target_${dir}`]) {
        return rpkg_config.directory_overrides[`target_${dir}`];
    }
    return path.join(rpkg_config.target_root, rpkg_config.target_prefix, dir);
}

const shortpkg_to_atom = function (shortpkg) {
    const shortpkg_regex = /^(?:([a-z-]+)\/)?([a-z0-9-]+)(?:@(.+))?$/;
    const elements = shortpkg_regex.exec(shortpkg);
    if (elements == null) {
        throw `${shortpkg} is not a valid package specifier`;
    }

    var atom = {
        package: elements[2]
    };
    if (elements[1]) {
        atom.category = elements[1];
    }
    if (elements[3]) {
        atom.version = elements[3];
    }

    var search_categories;
    var candidate_packages = [];

    if (!atom.category) {
        if (atom.version) {
            throw `version but no category specified for ${shortpkg}`;
        }
        // No category was provided. Let's go ahead and search
        // the package tree.

        search_categories = fs.readdirSync(get_host_directory('packages'));
    } else {
        search_categories = [atom.category];
    }

    var candidate_packages = [];
    search_categories.forEach((category) => {
        const packages = fs.readdirSync(path.join(get_host_directory('packages'), category));
        packages.forEach((pkgfile) => {
            const match = /^([a-z0-9-]+)@(.+)\.yml$/.exec(pkgfile);
            if (match
                && match[1] === atom.package
                && (!atom.version || match[2] === atom.version)) {
                candidate_packages.push({ category: category, package: match[1], version: match[2] });
            }
        });
    });

    if (candidate_packages.length == 0) {
        throw `No packages found for ${shortpkg}`;
    }
    if (candidate_packages.length > 1) {
        throw `Multiple packages found for ${shortpkg} (this will not be an error in the future)`;
    }

    atom = candidate_packages[0];
    atom.as_string = `${atom.category}/${atom.package}@${atom.version}`;
    return atom;
}

const atom_to_path = function (atom) {
    var version_part = '@' + atom.version;
    return path.join(atom.category, atom.package + version_part);
}

const atom_to_shortpkg = function (atom) {
    return atom.category + '/' + atom.package;
}

const shortpkg_to_atom_without_version = function (shortpkg) {
    const s = shortpkg.split('/');
    return {
        category: s[0],
        package: s[1]
    };
}

const get_all_versions = function (atom_without_version) {
    const packages = fs.readdirSync(path.join(get_host_directory('packages'), atom_without_version.category));
    var versions = [];

    packages.forEach((pkgfile) => {
        const match = /^([a-z0-9-]+)@(.+)\.yml$/.exec(pkgfile);
        if (match && match[1] === atom_without_version.package) {
            if (!semver.valid(match[2])) throw `Invalid version ${match[2]} for package ${atom_without_version.category}/${atom_without_version.package}`
            versions.push(match[2]);
        }
    });

    if (!versions.length) {
        throw `Couldn't find any versions for ${atom_without_version.category}/${atom_without_version.package}`;
    }

    return versions;
}

var pkgdesc_memo = {};
const get_package_description = function (atom) {
    if (pkgdesc_memo[atom_to_path(atom)]) return pkgdesc_memo[atom_to_path(atom)];

    const pkg_path = path.join(get_host_directory('packages'), atom_to_path(atom) + ".yml");
    const raw_package = fs.readFileSync(pkg_path, "utf8");

    const default_package = {
        comp: 'tar.xz',
        src: '%{filename}-%{version}.%{comp}',
        src_url: '%{upstream}/%{src}',
        unpack_dir: '%{filename}-%{version}',
        bdepend: [],
        rdepend: [],
        use_build_dir: false,
        configure_options: "--prefix=/usr %{additional_configure_options}",
        additional_configure_options: '',
        make_options: "-j56 %{additional_make_options}",
        additional_make_options: '',
        configure: "../%{unpack_dir}/configure %{configure_options}",
        make: "make %{make_options}",
        install: "make DESTDIR=$(realpath ..) install",
        pre_configure_script: undefined,
        post_install_script: undefined,
        queue_hooks: {},
    };

    var yaml;
    try {
        yaml = YAML.parse(raw_package);
    } catch (e) {
        throw `While parsing YAML for ${atom.category}/${atom.package}@${atom.version}: ${e}`;
    }

    const parsed_package = Object.assign(default_package, yaml);
    if (rpkg_config.use_default_depends) {
        parsed_package.bdepend.push('virtual/build-tools');
        parsed_package.rdepend.push('virtual/base-system');
    }
    // TODO: literally anything else
    var didreplace = false;
    do {
        didreplace = false;
        for (const key in parsed_package) {
            if (typeof parsed_package[key] != 'string') {
                continue;
            }
            var new_value = parsed_package[key];
            for (const key2 in parsed_package) {
                new_value = new_value.replace(`\%{${key2}}`, parsed_package[key2]);
            }
            if (new_value != parsed_package[key]) {
                parsed_package[key] = new_value;
                didreplace = true;
            }
        }
    } while (didreplace);

    pkgdesc_memo[atom_to_path(atom)] = parsed_package;

    return parsed_package;
}

const add_to_transaction = function (transaction, shortpkg, version_spec, where) {
    const awv = shortpkg_to_atom_without_version(shortpkg);

    var possible_bdepends = {};
    var possible_rdepends = {};
    for (const version of get_all_versions(awv)) {
        if (!semver.satisfies(version, version_spec, { includePrerelease: true })) continue;
        const pkgdesc = get_package_description({ category: awv.category, package: awv.package, version: version });
        for (const bdepend of pkgdesc.bdepend) {
            const parsed = /^([a-z-]+\/[a-z0-9-]+)([@>=<]?=?.*)?$/.exec(bdepend);
            if (!parsed) throw `Couldn't parse bdepend ${bdepend} for ${shortpkg}`;
            if (!possible_bdepends[parsed[1]]) possible_bdepends[parsed[1]] = [];
            possible_bdepends[parsed[1]].push(parsed[2] || '*');
        }
        for (const rdepend of pkgdesc.rdepend) {
            const parsed = /^([a-z-]+\/[a-z0-9-]+)([@>=<]?=?.*)?$/.exec(rdepend);
            if (!parsed) throw `Couldn't parse rdepend ${rdepend} for ${shortpkg}`;
            if (!possible_rdepends[parsed[1]]) possible_rdepends[parsed[1]] = [];
            possible_rdepends[parsed[1]].push(parsed[2] || '*');
        }
    }

    for (const key in possible_bdepends) {
        if (!transaction.host[key]) transaction.host[key] = [];
        transaction.host[key].push(semver.simplifyRange(get_all_versions(shortpkg_to_atom_without_version(key)), possible_bdepends[key].join(' || '), { includePrerelease: true }));
    }
    for (const key in possible_rdepends) {
        if (!transaction[where][key]) transaction[where][key] = [];
        transaction[where][key].push(semver.simplifyRange(get_all_versions(shortpkg_to_atom_without_version(key)), possible_rdepends[key].join(' || '), { includePrerelease: true }));
    }

    if (!transaction[where][shortpkg]) transaction[where][shortpkg] = [];
    transaction[where][shortpkg].push(version_spec);
}

const simplify_transaction = function (transaction) {
    for (const pkg in transaction.host) {
        transaction.host[pkg] = [semver.simplifyRange(get_all_versions(shortpkg_to_atom_without_version(pkg)), transaction.host[pkg].join(' '), { includePrerelease: true })];
    }
    for (const pkg in transaction.target) {
        transaction.target[pkg] = [semver.simplifyRange(get_all_versions(shortpkg_to_atom_without_version(pkg)), transaction.target[pkg].join(' '), { includePrerelease: true })];
    }
}

const resolve_transaction = function (transaction) {
    for (const pkg in transaction.host) {
        transaction.host[pkg] = transaction.host[pkg][0];
    }
    for (const pkg in transaction.target) {
        transaction.target[pkg] = transaction.target[pkg][0];
    }
}

const version_installed_or_pending = function (pkg, steps, where, pending) {
    const pkgfile = path.join((where == 'host') ? get_host_directory('installed') : get_target_directory('installed'), pkg);
    if (fs.existsSync(pkgfile)) {
        return fs.readFileSync(pkgfile, "utf8").trim();
    }

    for (const step of steps) {
        if (step.type == where + '_install' && step.package == pkg) {
            return step.version;
        }
    }

    if (pending[where + ':' + pkg]) return pending[where + ':' + pkg];

    return null;
}

const plan_build_recursive = async function (transaction, steps, pkg, where, pending) {
    if (!pending) pending = {};
    if (PBR_NOISY_DEBUG) console.log(`PBR: ${pkg} => ${where}`);

    const already_installed = version_installed_or_pending(pkg, steps, where, pending);
    if (already_installed) {
        if (PBR_NOISY_DEBUG) console.log(` => have existing version ${already_installed}`);
        if (semver.satisfies(already_installed, transaction[where][pkg], { includePrerelease: true })) {
            if (PBR_NOISY_DEBUG) console.log('  which is OK');
            return;
        } else {
            if (PBR_NOISY_DEBUG) console.log('  which must be removed first');
            steps.push({
                type: where + '_remove',
                package: pkg
            });
        }
    }

    // If we got here, this package isn't installed. Hence, we can install whatever version we want.
    const version = semver.maxSatisfying(get_all_versions(shortpkg_to_atom_without_version(pkg)), transaction[where][pkg], { includePrerelease: true });
    const atom = shortpkg_to_atom_without_version(pkg);
    atom.version = version;

    pending[where + ':' + pkg] = version;

    if (PBR_NOISY_DEBUG) console.log(`[${where} ${pkg}] => selected version ${version}`);

    var have_built_package = atom.category == 'virtual';
    if (!have_built_package) {
        have_built_package = fs.existsSync(path.join(get_host_directory('built'), atom_to_path(atom)) + ".tar.xz");
    }

    if (!have_built_package && rpkg_config.repository) {
        if (PBR_NOISY_DEBUG) console.log(`checking repo for ${pkg}`);
        const https_p = new Promise((res, rej) => {
            https.request(rpkg_config.repository + "/built/" + atom_to_path(atom) + ".tar.xz", {
                method: 'HEAD'
            }, (https_res) => {
                if (PBR_NOISY_DEBUG) console.log(`${pkg}: ${https_res.statusCode}`);
                if (https_res.statusCode == 200) res(true);
                else res(false);
            }).end();
        });
        https_p.then((r) => have_built_package = r);
        await https_p;
    }

    for (const step of steps) {
        if (step.type == 'build' && step.package == pkg) {
            have_built_package = true;
        }
    }

    const pkgdesc = get_package_description(atom);

    if (!have_built_package) {
        if (atom.category != 'virtual') {
            if (PBR_NOISY_DEBUG) console.log(' => missing package, must build from source');
            for (const bdepend of pkgdesc.bdepend) {
                const parsed = /^([a-z-]+\/[a-z0-9-]+)([@>=<]?=?.*)?$/.exec(bdepend);
                if (PBR_NOISY_DEBUG) console.log(`[${where} ${pkg}]  => recursing for bdep ${bdepend}`);
                await plan_build_recursive(transaction, steps, parsed[1], 'host', pending);
            }
            steps.push({
                type: 'fetch_source',
                package: pkg,
                version: version
            });
            steps.push({
                type: 'build',
                package: pkg,
                version: version
            });
        }
        if (PBR_NOISY_DEBUG) console.log(`[${where} ${pkg}] => built`);
    }

    for (const rdepend of pkgdesc.rdepend) {
        const parsed = /^([a-z-]+\/[a-z0-9-]+)([@>=<]?=?.*)?$/.exec(rdepend);
        if (PBR_NOISY_DEBUG) console.log(`[${where} ${pkg}]  => recursing for rdep ${rdepend}`);
        await plan_build_recursive(transaction, steps, parsed[1], where, pending);
    }

    if (atom.category != 'virtual') {
        if (have_built_package) {
            steps.push({
                type: 'fetch_binary',
                package: pkg,
                version: version
            });
        }
    }

    steps.push({
        type: where + '_install',
        package: pkg,
        version: version
    });

    if (PBR_NOISY_DEBUG) console.log(`[${where} ${pkg}] => installed`);
}

const queue_hooks = function (shortpkg, where, obj) {
    const atom = shortpkg_to_atom(shortpkg);
    const pkgdesc = get_package_description(atom);

    for (const hook in pkgdesc.queue_hooks) {
        obj[where][hook] = true;
    }
}

const process_hooks = async function (where, obj) {
    if (obj[where].ldconfig) {
        console.log(`running ldconfig (${where})`);
        if (where == 'target') {
            await run_process('ldconfig', 'ldconfig -X -r .', rpkg_config.target_root);
        } else {
            await run_process('ldconfig', 'ldconfig -X', '/');
            //await run_process('ldconfig', 'ls -l /usr/lib/ /lib', '/');
        }
    }
}

const install_packages = async function (shortpkgs) {
    var transaction = {
        host: {},
        target: {}
    };

    for (const pkg of shortpkgs) {
        const atom = shortpkg_to_atom(pkg);
        add_to_transaction(transaction, atom_to_shortpkg(atom), atom.version || '*', 'target');
    }

    simplify_transaction(transaction);

    var old_transaction;
    do {
        old_transaction = transaction;
        transaction = {
            host: {},
            target: {}
        };
        for (const pkg in old_transaction.host) {
            const spec = semver.simplifyRange(get_all_versions(shortpkg_to_atom_without_version(pkg)), old_transaction.host[pkg].join(' '), { includePrerelease: true });
            add_to_transaction(transaction, pkg, spec, 'host');
        }
        for (const pkg in old_transaction.target) {
            const spec = semver.simplifyRange(get_all_versions(shortpkg_to_atom_without_version(pkg)), old_transaction.target[pkg].join(' '), { includePrerelease: true });
            add_to_transaction(transaction, pkg, spec, 'target');
        }
        simplify_transaction(transaction);
    } while (!equal(old_transaction, transaction));

    resolve_transaction(transaction);

    var steps = [];
    for (const pkg of shortpkgs) {
        const atom = shortpkg_to_atom(pkg);
        await plan_build_recursive(transaction, steps, atom_to_shortpkg(atom), 'target');
    }

    // TODO hoist fetches
    var sorted_steps = [];
    steps.filter((step) => step.type === 'fetch_binary').forEach((step) => sorted_steps.push(step));
    steps.filter((step) => step.type === 'fetch_source').forEach((step) => sorted_steps.push(step));
    steps.filter((step) => !step.type.startsWith('fetch_')).forEach((step) => sorted_steps.push(step));
    steps = sorted_steps;

    console.log("Here's the plan: ");
    var last_seen_type;
    var current_line;
    for (const step of steps) {
        if (step.type != last_seen_type && current_line) {
            console.log(current_line);
            last_seen_type = step.type;
            current_line = `${last_seen_type}:`;
        }
        current_line += ` ${step.package}@${step.version}`;
        if (current_line.length > 100) {
            console.log(current_line);
            current_line = "    ";
        }
    }

    var p;
    if (rpkg_config.confirm) {
        p = new Promise((res, rej) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question("Is this OK? [Y/n] ", (answer) => {
                rl.close();
                if (/^(y.*)?$/i.exec(answer)) {
                    res();
                } else {
                    rej(false);
                }
            });
        });
    } else {
        p = Promise.resolve(true);
    }
    p.catch((err) => {
        if (err) {
            console.error(err);
        }
        console.log("Stopping.");
        process.exit(1);
    });
    await p;

    var hooks = { host: {}, target: {} };
    for (const step of steps) {
        if (step.type == 'build') {
            await process_hooks('host', hooks);
            await do_build([`${step.package}@${step.version}`]);
        } else if (step.type == 'host_install') {
            await do_install([`${step.package}@${step.version}`], '/', 'host');
            queue_hooks(`${step.package}@${step.version}`, 'host', hooks);
        } else if (step.type == 'target_install') {
            await do_install([`${step.package}@${step.version}`], rpkg_config.target_root, 'target');
            queue_hooks(`${step.package}@${step.version}`, 'target', hooks);
        } else if (step.type == 'fetch_binary') {
            const file = `${step.package}@${step.version}.tar.xz`;
            if (!fs.existsSync(path.join(get_host_directory('built'), file))) {
                if (!fs.existsSync(path.dirname(path.join(get_host_directory('built'), file)))) {
                    fs.mkdirSync(path.dirname(path.join(get_host_directory('built'), file)));
                }

                console.log(`Downloading: ${file}`);
                const pkg_req = https.get(rpkg_config.repository + "/built/" + file);
                const stream = fs.createWriteStream(path.join(get_host_directory('built'), file));
                var total, downloaded = 0;

                const pkg_p = new Promise((resolve, reject) => {
                    pkg_req.on('response', (res) => {
                        total = parseInt(res.headers['content-length']);
                        res.pipe(stream);
                        res.on('data', (chunk) => {
                            downloaded += chunk.length;
                            process.stdout.write(`${file} ${downloaded}/${total}\r`);
                        });
                    });
                    stream.on('finish', () => {
                        stream.close(resolve);
                    });
                });
                await pkg_p;
            }
        }
    }
    await process_hooks('target', hooks);
}

const do_build = async function (packages) {
    for (const pkg of packages) {
        console.log(`Building: ${pkg}`);
        const atom = shortpkg_to_atom(pkg);
        const pkgdesc = get_package_description(atom);

        const builder = child_process.fork(`${path.dirname(fileURLToPath(import.meta.url))}/builder.js`,
            [],
            { stdio: 'pipe' });

        // process.send doesn't appear to work in very minimal environments.
        // let's just use pipes.
        builder.stdin.write(JSON.stringify({
            pkgdesc: pkgdesc,
            config: rpkg_config,
            atom: atom.as_string
        }));
        builder.stdin.end();

        builder.stdout.on('data', (data) => {
            console.log(`\x1b[33m${pkg}\x1b[0m: ${data.toString('utf8').trim()}`);
        });

        builder.stderr.on('data', (data) => {
            console.log(`\x1b[33m${pkg}\x1b[31m! ${data.toString('utf8').trim()}\x1b[0m`);
        });

        var p = new Promise((res, rej) => {
            builder.on('close', (m) => {
                console.log('builder exited with code ' + m);
                res(m)
            });
        });

        const res = await p;
        console.log(`got: ${res}`);
        if (res !== 0) {
            throw `Something went wrong while building ${pkg}!`;
        }
    }
}

const do_install = async function (packages, destdir, where) {
    for (const pkg of packages) {
        const atom = shortpkg_to_atom(pkg);
        if (atom.category != 'virtual') {
            await run_process('unpack', `pv -peb -N ${atom.category}/${atom.package} < ${get_host_directory('built')}/${atom.as_string}.tar.xz | xz -dc  | tar xp`, destdir);
        }
        const pkgdesc = get_package_description(atom);
        if (pkgdesc.post_unpack_script) {
            console.log(`Running post-unpack script for ${pkg}`);
            await run_process('post-unpack', pkgdesc.post_unpack_script, destdir);
        }
        const file = `${(where == 'target') ? get_target_directory('installed') : get_host_directory('installed')}/${atom.category}/${atom.package}`;
        await run_process('mark', `mkdir -p $(dirname ${file}); echo ${atom.version} > ${file}`, destdir);
    }
}

// TODO put this in a library + merge with builder.js
const run_process = async function (name, cmd, dir) {
    const proc = child_process.spawn('sh', ['-ec', cmd], { cwd: dir, stdio: 'inherit' });
    const proc_p = new Promise((res, rej) => {
        proc.on('close', (rc) => {
            if (rc) rej(rc);
            res(rc);
        });
    });
    proc_p.catch((rej) => {
        console.error(`Got error in ${name}: ${rej}`);
        process.exit(1);
    })
    return proc_p;
}

const synchronize_packages = async function () {
    if (!rpkg_config.repository) throw 'No repository defined';

    const manifest_req = https.get(rpkg_config.repository + "/packages/MANIFEST");
    manifest_req.on('response', (res) => {
        var manifest = "";
        res.on('data', (data) => {
            manifest += data.toString('utf-8');
        })

        res.on('end', async () => {
            var parsed = {};
            manifest.split("\n").filter(s => s.length > 0).forEach((s) => {
                const a = s.split(" ");
                parsed[a[0]] = a.slice(1);
            });

            var missing_files = [];
            for (const pkgname in parsed) {
                for (const version of parsed[pkgname]) {
                    const f = `${pkgname}@${version}.yml`;
                    if (!fs.existsSync(path.join(get_host_directory('packages'), f))) {
                        missing_files.push(f);
                    }
                }
            }

            for (const file of missing_files) {
                if (!fs.existsSync(path.dirname(path.join(get_host_directory('packages'), file)))) {
                    fs.mkdirSync(path.dirname(path.join(get_host_directory('packages'), file)));
                }

                const stream = fs.createWriteStream(path.join(get_host_directory('packages'), file));
                const pkg_req = https.get(rpkg_config.repository + "/packages/" + file);
                const pkg_p = new Promise((resolve, reject) => {
                    pkg_req.on('response', (res) => {
                        res.pipe(stream);
                        stream.on('finish', () => {
                            stream.close(resolve);
                        });
                    })
                });
                await pkg_p;
                console.log(file);
            }
        });
    });
}

const argv = minimist(process.argv.slice(2), {
    string: ["host_prefix", "target_prefix", "target_root", "build_in_container", "host_build_dir", "repository"],
    boolean: ["without_default_depends", "skip_confirm"],
});

if (argv.host_prefix) {
    rpkg_config.host_prefix = argv.host_prefix;
}

if (argv.host_build_dir) {
    rpkg_config.directory_overrides.host_build_dir = argv.host_build_dir;
}

if (argv.target_prefix) {
    rpkg_config.target_prefix = argv.target_prefix;
}

if (argv.target_root) {
    rpkg_config.target_root = argv.target_root;
}

rpkg_config.use_default_depends = !argv.without_default_depends;
rpkg_config.confirm = !argv.skip_confirm;
rpkg_config.repository = argv.repository;

//console.log(rpkg_config);

(async () => {
    if (argv._.length > 0) {
        if (argv._[0] === 'install') {
            if (argv._.length > 1) {
                await install_packages(argv._.slice(1));
            } else {
                console.error("install given with no packages");
            }
        } else if (argv._[0] === 'build') {
            if (argv._.length > 1) {
                await do_build(argv._.slice(1));
            } else {
                console.error("build given with no packages");
            }
        } else if (argv._[0] === 'host_install') {
            if (argv._.length > 1) {
                await do_install(argv._.slice(1), '/', 'host');
                var hooks = { host: {}, target: {} };
                for (const pkg of argv._.slice(1)) {
                    queue_hooks(pkg, 'host', hooks);
                }
                await process_hooks('host', hooks);
            } else {
                console.error("host_install given with no packages");
            }
        } else if (argv._[0] === 'target_install') {
            if (argv._.length > 1) {
                await do_build(argv._.slice(1), rpkg_config.target_root, 'target');
                var hooks = { host: {}, target: {} };
                for (const pkg of argv._.slice(1)) {
                    queue_hooks(pkg, 'target', hooks);
                }
                await process_hooks('target', hooks);
            } else {
                console.error("target_install given with no packages");
            }
        } else if (argv._[0] === 'postinstall') {
            if (argv._.length > 1) {
                for (const pkg of argv._.slice(1)) {
                    const atom = shortpkg_to_atom(pkg);
                    const pkgdesc = get_package_description(atom);
                    if (pkgdesc.post_unpack_script) {
                        console.log(`Running post-unpack script for ${pkg}`);
                        await run_process('post-unpack', pkgdesc.post_unpack_script, '/');
                    }
                }
            } else {
                console.error("target_install given with no packages");
            }
        } else if (argv._[0] === 'sync') {
            await synchronize_packages();
        }
    }
})().catch((e) => {
    console.error(e);
    process.exit(1);
});