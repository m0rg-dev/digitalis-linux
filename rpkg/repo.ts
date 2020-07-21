import { PackageCategory, PackageName, ResolvedAtom, Atom, PackageVersion } from "./atom.js";
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import * as https from 'https';
import * as http from 'http';
import * as child_process from 'child_process';
import { URL } from "url";
import { Config } from "./config.js";
import { Manifest, ManifestPackage } from "./manifest";
import { Database } from "./db.js";
import * as byteSize from 'byte-size';
import * as tar_stream from 'tar-stream';

export class Repository {
    local_packages_path: string;
    local_builds_path: string;
    root_path: string;
    private remote_url: URL;
    private manifest_fetched_already: boolean;

    constructor(root_path: string, remote_url?: URL) {
        this.local_packages_path = path.join(root_path, "packages");
        this.local_builds_path = path.join(root_path, "builds");
        this.root_path = root_path;
        this.remote_url = remote_url;
        this.manifest_fetched_already = false;
    }

    async getAllCategories(local?: boolean): Promise<PackageCategory[]> {
        if (local) {
            return new Promise<PackageCategory[]>((res, rej) => {
                fs.readdir(this.local_packages_path, { withFileTypes: true }, function (err, files) {
                    if (err) {
                        rej(err);
                    } else {
                        res(files.filter(file => file.isDirectory()).map(file => file.name));
                    }
                });
            });
        } else {
            return this.maybeUpdateManifest()
                .then((manifest) => {
                    return manifest.getCategories();
                });
        }
    }

    async getAllNames(c: PackageCategory, local?: boolean): Promise<PackageName[]> {
        if (local) {
            return new Promise<PackageName[]>((res, rej) => {
                fs.readdir(path.join(this.local_packages_path, c), function (err, files) {
                    if (err) {
                        rej(err);
                    } else {
                        res(Array.from((new Set(files.map(file => file.split('.yml')[0])).values())));
                    }
                });
            });
        } else {
            const manifest = await this.maybeUpdateManifest()
            return Promise.resolve(manifest.getAllPackages()
                .filter((pkg) => pkg.atom.getCategory() == c)
                .map((pkg) => pkg.atom.getName()));
        }
    }

    async getPackageDescription(atom: ResolvedAtom): Promise<PackageDescription> {
        const self = this;
        const manifest = await self.maybeUpdateManifest();
        const pkg = manifest.getPackage(atom);
        if (!pkg) {
            throw `Couldn't find ${atom.format()} in Manifest.yml!`;
        }

        const package_path = path.join(this.local_packages_path, atom.getCategory(), atom.getName() + ".yml");
        var maybe_package: PackageDescription;
        try {
            const raw_yml = await fs.promises.readFile(package_path);
            const tentative_package = new PackageDescription(raw_yml.toString('utf8'));
            if (tentative_package.version.version == pkg.version.version) maybe_package = tentative_package;
        } catch (err) {
            // this probably means the file doesn't exist so whatever
        }

        if (maybe_package) return Promise.resolve(maybe_package);

        if (self.remote_url) {
            return new Promise<PackageDescription>((resolve, reject) => {
                console.log(`Retrieving ${atom.format()} from remote server...`);
                ((self.remote_url.protocol == 'https') ? https : http).get(new URL(`packages/${atom.getCategory()}/${atom.getName()}.yml`, self.remote_url), (response) => {
                    if (response.statusCode == 200) {
                        var raw_yml: string = "";
                        response.on('data', (data) => {
                            raw_yml += data.toString('utf8');
                        });
                        response.on('end', async () => {
                            await fs.promises.mkdir(path.dirname(package_path), { recursive: true });
                            await fs.promises.writeFile(package_path, raw_yml);
                            resolve(new PackageDescription(raw_yml));
                        });
                    } else {
                        reject(`Got ${response.statusCode} from repo while looking for ${atom.format()}`);
                    }
                });
            });
        } else {
            throw `Have outdated or missing local ${atom.format()} and no remotes defined`;
        }
    }

    // TODO this is in desperate need of refactoring
    async maybeUpdateManifest(): Promise<Manifest> {
        const self = this;
        const manifest_path = path.join(self.root_path, "Manifest.yml");
        return fs.promises.access(manifest_path, fs.constants.R_OK)
            .then(async (ok) => {
                return fs.promises.readFile(manifest_path).then((data) => {
                    const manifest = Manifest.deserialize(data.toString('utf8'));
                    if (self.remote_url && !self.manifest_fetched_already) {
                        return undefined;
                    }
                    return manifest;
                })
            }, async (err) => undefined)
            .then(async (maybe_manifest) => {
                if (maybe_manifest) return maybe_manifest;
                if (self.remote_url) {
                    return new Promise<Manifest>((resolve, reject) => {
                        console.log("Retrieving Manifest.yml from remote server...");

                        ((self.remote_url.protocol == 'https') ? https : http).get(new URL('Manifest.yml', self.remote_url), (response) => {
                            if (response.statusCode == 200) {
                                var raw_yml: string = "";
                                response.on('data', (data) => {
                                    raw_yml += data.toString('utf8');
                                });
                                response.on('end', async () => {
                                    await fs.promises.writeFile(manifest_path, raw_yml)
                                    self.manifest_fetched_already = true;
                                    resolve(Manifest.deserialize(raw_yml));
                                });
                            } else {
                                reject(`Got ${response.statusCode} from repo while looking for Manifest.yml!`);
                            }
                        });
                    });
                } else {
                    throw `Don't have local manifest and no remotes defined (${self.root_path})`;
                }
            });
    }

    async buildExists(atom: ResolvedAtom): Promise<boolean> {
        return this.maybeUpdateManifest().then((manifest) => {
            return !!(manifest.getBuild(atom));
        })
    }

    async buildManifest(): Promise<void> {
        const self = this;
        var manifest = new Manifest();
        const categories = await self.getAllCategories(true);
        const structured_names = await Promise.all(categories.map(async function (category) {
            return self.getAllNames(category, true).then(names => names.map(name => [category, name]))
        }));
        const all_names = structured_names.flat(1);
        const all_packages = await Promise.all(all_names.map(async (name) => {
            const atom = new ResolvedAtom(name[0], name[1]);
            const raw_data = await fs.promises.readFile(path.join(self.local_packages_path, name[0], name[1] + ".yml"));
            const desc = new PackageDescription(raw_data.toString('utf8'));
            return new ManifestPackage(atom, desc.version, path.join(name[0], name[1] + ".yml"), raw_data);
        }));
        all_packages.forEach((pkg) => manifest.addPackage(pkg));
        await Promise.all(all_packages.map(async (pkg) => {
            try {
                const data = await fs.promises.readFile(path.join(self.local_builds_path, pkg.atom.getCategory(), pkg.atom.getName() + "," + pkg.version.version + ".tar.xz"));
                const build = new ManifestPackage(pkg.atom, pkg.version, path.join(self.local_builds_path, pkg.atom.getCategory(), pkg.atom.getName() + "," + pkg.version.version + ".tar.xz"), data);
                manifest.addBuild(build);
            } catch (e) {
                // if we can't read the build it doesn't exist - this can happen
            }
        }));
        return fs.promises.writeFile(path.join(self.root_path, "Manifest.yml"), manifest.serialize());
    }

    async getSource(source: string, source_url?: string): Promise<Buffer> {
        if (fs.existsSync(path.join(this.root_path, "sources", source))) {
            console.log(`Source ${path.join(this.root_path, "sources", source)} is available locally.`);
            return fs.promises.readFile(path.join(this.root_path, "sources", source));
        } else {
            if (source_url) {
                console.warn(`Source ${source} is not available locally. Fetching with wget...`);
                const wget = child_process.spawn('wget', [source_url, '-O', path.join(this.root_path, 'sources', source)], { stdio: 'inherit' });
                await new Promise((res, rej) => {
                    wget.on('exit', (code, signal) => {
                        if (signal) rej(`wget killed by signal ${signal}`);
                        if (code != 0) rej(`wget exited with failure status`);
                        res();
                    });
                })
                return fs.promises.readFile(path.join(this.root_path, "sources", source));
            } else {
                throw `Source ${source} is not available locally and no upstream URL was given`;
            }
        }
    }

    async getSourceFor(pkg: PackageDescription): Promise<Buffer> {
        //const manifest = await this.maybeUpdateManifest();
        //const src = manifest.getSource(pkg.src);
        return this.getSource(pkg.src, pkg.src_url);
    }

    static run_build_stage(container_id: string, name: string, script: string, bindmount: string, bindtarget: string) {
        console.log(`Running ${name}...`);
        var args: string[];
        if (bindmount) {
            args = ['run', `--mount=type=bind,source=${bindmount},destination=${bindtarget}`, container_id, 'sh', '-exc', script]
        } else {
            args = ['run', container_id, 'sh', '-exc', script];
        }
        const rc = child_process.spawnSync('buildah', args, { stdio: 'inherit' });
        if (rc.signal) throw `${name} killed by signal ${rc.signal}`;
        if (rc.status != 0) throw `${name} exited with failure status!`;
    }

    async buildPackage(atom: ResolvedAtom, container_id: string, container_mountpoint: string) {
        var pkgdesc: PackageDescription = await this.getPackageDescription(atom);
        child_process.spawnSync('buildah', ['config', '--workingdir', '/', container_id]);
        child_process.spawnSync('buildah', ['run', container_id, 'mkdir', '/target_root', '/build'], { stdio: 'inherit' });

        if (pkgdesc.additional_sources) {
            for (const source of pkgdesc.additional_sources) {
                const src: Buffer = await this.getSource(source);
                child_process.spawnSync(
                    'buildah', ['run', container_id, 'sh', '-c', `cat >/${source}`], {
                    input: src,
                }
                );
            }
        }

        var build_dir: string;
        var bind_dir: string;
        build_dir = `/tmp/rpkg/build-${pkgdesc.unpack_dir}`;
        fs.mkdirSync(build_dir, { recursive: true });

        if (pkgdesc.src) {
            var src: Buffer = await this.getSourceFor(pkgdesc);
            console.log(src.length);

            console.log("Unpacking...");
            if (pkgdesc.comp.startsWith('tar')) {
                const program_by_comp = {
                    "tar.gz": "gunzip -c",
                    "tar.bz2": "bzcat",
                    "tar.xz": "xzcat"
                };

                const uncomp = child_process.spawn('sh', ['-c', program_by_comp[pkgdesc.comp]]);
                uncomp.stdin.write(src);
                uncomp.stdin.end();

                const untar = (pkgdesc.use_build_dir)
                    ? child_process.spawn('tar', ['x', '--no-same-owner'], { cwd: container_mountpoint })
                    : child_process.spawn('tar', ['x', '--no-same-owner', '--strip-components=1'], { cwd: build_dir });
                uncomp.stdout.pipe(untar.stdin);

                uncomp.stderr.on('data', (data) => {
                    process.stderr.write(data);
                })

                untar.stdout.on('data', (data) => {
                    process.stdout.write(data);
                });
                untar.stderr.on('data', (data) => {
                    process.stderr.write(data);
                });

                await new Promise((res, rej) => {
                    untar.on('exit', (code, signal) => {
                        if (signal) rej(`untar killed by signal ${signal}`);
                        if (code != 0) rej(`untar exited with failure status`);
                        res();
                    });

                    untar.on('error', (err) => {
                        rej(err);
                    });
                });

                console.log("done");
            } else if (pkgdesc.comp == 'zip') {
                child_process.spawnSync(
                    'buildah', ['run', container_id, 'sh', '-c', `mkdir -p ${pkgdesc.unpack_dir}; cd ${pkgdesc.unpack_dir}; bsdtar -x -f -`], {
                    input: src,
                    stdio: ['pipe', 'inherit', 'inherit']
                });
            } else {
                console.warn(`Unknown compression type ${pkgdesc.comp}`);
                // keep going, maybe that's on purpose
                child_process.spawnSync(
                    'buildah', ['run', container_id, 'sh', '-c', `cat > ${pkgdesc.src}`], {
                    input: src,
                    stdio: ['pipe', 'inherit', 'inherit']
                });
            }
        }


        if (pkgdesc.use_build_dir) {
            //child_process.spawnSync('buildah', ['config', '--workingdir', '/build', container_id], { stdio: 'inherit' });
            bind_dir = "/build";
        } else {
            child_process.spawnSync('buildah', ['config', '--workingdir', path.join("/", pkgdesc.unpack_dir), container_id], { stdio: 'inherit' });
            bind_dir = path.join("/", pkgdesc.unpack_dir);
        }

        if (pkgdesc.pre_configure_script) Repository.run_build_stage(container_id, "pre-configure script", pkgdesc.pre_configure_script, build_dir, bind_dir);
        if (pkgdesc.configure) Repository.run_build_stage(container_id, "configure", pkgdesc.configure, build_dir, bind_dir);
        if (pkgdesc.make) Repository.run_build_stage(container_id, "make", pkgdesc.make, build_dir, bind_dir);
        if (pkgdesc.install) Repository.run_build_stage(container_id, "make install", pkgdesc.install, build_dir, bind_dir);

        child_process.spawnSync('buildah', ['config', '--workingdir', '/target_root', container_id]);

        if (pkgdesc.post_install_script) Repository.run_build_stage(container_id, "post-install script", pkgdesc.post_install_script, build_dir, bind_dir);

        // begin license determination

        const possible_licenses = [];
        if (pkgdesc.src) {
            var args: string[];
            if (pkgdesc.use_build_dir) {
                args = ['run', container_id, 'find', path.join("/", pkgdesc.unpack_dir), '-print0'];
            } else {
                args = ['run', `--mount=type=bind,source=${build_dir},destination=${bind_dir}`, container_id, 'find', path.join("/", pkgdesc.unpack_dir), '-print0']
            }

            const findsrc = child_process.spawnSync('buildah', args, { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 128 * 1024 * 1024 });
            for (const file of findsrc.stdout.toString().split('\0')) {
                const basename = path.basename(file);
                if (/^(LICEN[SC]E(\..*)?|COPYING(.*)?|COPYRIGHT)$/.test(basename)) {
                    possible_licenses.push(file);
                }
            }

            console.log(`Have potential license: ${possible_licenses.join(", ")}`);
        }

        var license_text = "";
        if (pkgdesc.license) {
            license_text += `The package maintainer believes ${atom.format()} ${pkgdesc.version.version} is available under the '${pkgdesc.license}' license.\n\n`;
        } else {
            license_text += `The package maintainer has not specified a license for ${atom.format()} ${pkgdesc.version.version}.\n\n`;
        }

        if (possible_licenses.length) {
            license_text += "Additionally, license information was found in the package source and is reproduced below.\n\n";
            for (const file of possible_licenses) {
                const text = fs.readFileSync(path.join(pkgdesc.use_build_dir ? container_mountpoint : path.dirname(build_dir), pkgdesc.use_build_dir ? file : "build-" + (file.substr(1))));
                license_text += `${file}:\n${text.toString()}\n\n`;
            }
        } else if (pkgdesc.license_location.startsWith('given')) {
            license_text += "Additionally, this license information was provided in the build file:\n\n";
            license_text += pkgdesc.license_location.substr(6) + "\n";
        } else {
            license_text += "No licensing information was found in the package source.\n\n";
        }

        if (pkgdesc.src_url) {
            license_text += `While this is intended to be an accurate representation of ${atom.format()} ${pkgdesc.version.version}'s licensing, check the package source at ${pkgdesc.src_url} to be sure.\n`;
        }
        // end license determination

        // begin file-based hooks

        // Someday, we're going to have an Arch-like system where individual packages (glibc, fontconfig, etc) can register hooks
        // somewhere in the filesystem that get processed during this step. For now, though, we're just going to look for
        // shared libraries.

        var need_ldconfig = false;

        const find = child_process.spawnSync('buildah', ['run', container_id, 'find', '/target_root', '-print0'], { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 128 * 1024 * 1024 });
        for (const file of find.stdout.toString().split('\0')) {
            if (file.endsWith('.so')) {
                need_ldconfig = true;
            }
        }

        if (need_ldconfig) Repository.run_build_stage(container_id, "ldconfig", "ldconfig -N -r .", null, null);

        // end file-based hooks

        console.log("Compressing...");
        const tar = child_process.spawn('buildah', ['run', container_id, 'tar', 'cp', '.']);
        tar.on('exit', (status, signal) => {
            if (signal) throw `tar killed by signal ${signal}`;
            if (status != 0) throw "tar exited with failure status!";
        });

        // begin tarfile manipulation

        var extract = tar_stream.extract();
        var pack = tar_stream.pack();

        const file_list = [];

        extract.on('entry', function (header, stream, callback) {
            // Potential packaging issue: packages placed in /usr/etc or /usr/var
            if (header.name.startsWith('./usr/etc')) {
                console.error(`Package ${atom.format()} ${pkgdesc.version.version} has attempted to install files to /usr/etc. This is usually the result of a under-informed build - try passing --sysconfdir=/etc to configure.`);
                throw "Aborting due to packaging issues";
            }
            if (header.name.startsWith('./usr/var')) {
                console.error(`Package ${atom.format()} ${pkgdesc.version.version} has attempted to install files to /usr/var. This is usually the result of a under-informed build - try passing --localstatedir=/var to configure.`);
                throw "Aborting due to packaging issues";
            }

            // Potential packaging issue: pkgconfig scripts placed in /usr/lib64/pkgconfig (meson does this sometimes)
            if (header.name.startsWith('./usr/lib64/pkgconfig')) {
                console.error(`Package ${atom.format()} ${pkgdesc.version.version} has attempted to install pkg-config data to /usr/lib64/pkgconfig. This is probably meson's fault - stick a 'mv' in the post_install_script.`);
                throw "Aborting due to packaging issues";
            }

            file_list.push(header.name);

            stream.pipe(pack.entry(header, callback));
        });

        extract.on('finish', function () {
            if (!file_list.some((f) => f == './usr/')) pack.entry({ name: './usr/', mode: 0o755, type: 'directory' });
            if (!file_list.some((f) => f == './usr/share/')) pack.entry({ name: './usr/share/', mode: 0o755, type: 'directory' });
            if (!file_list.some((f) => f == './usr/share/licenses/')) pack.entry({ name: './usr/share/licenses/', mode: 0o755, type: 'directory' });
            if (!file_list.some((f) => f == './usr/share/licenses/' + atom.getCategory())) pack.entry({ name: './usr/share/licenses/' + atom.getCategory(), mode: 0o755, type: 'directory' });
            pack.entry({ name: `./usr/share/licenses/${atom.getCategory()}/${atom.getName()}` }, license_text);
            pack.finalize();
        });

        tar.stdout.pipe(extract);

        // end tarfile manipulation

        const chunks = [];
        for await (let chunk of pack) {
            chunks.push(chunk);
        }

        const xz = child_process.spawnSync('xz', ['-T0', '-c'], {
            input: Buffer.concat(chunks),
            maxBuffer: 2 * 1024 * 1024 * 1024 // 2 GiB
        });
        console.log(`  Compressed package is ${byteSize(xz.stdout.length)}.`);
        const target_path = path.join(this.local_builds_path, atom.getCategory(), atom.getName() + "," + pkgdesc.version.version + ".tar.xz");
        console.log(`Writing to ${target_path}...`);
        if (!fs.existsSync(path.dirname(target_path))) fs.mkdirSync(path.dirname(target_path), { recursive: true });
        fs.writeFileSync(target_path, xz.stdout);
        console.log('Cleaning up (in build container)...');
        child_process.spawnSync('buildah', ['run', container_id, 'rm', '-rf', '/target_root', '/build', pkgdesc.unpack_dir], { stdio: 'inherit' });
    }

    async installPackage(atom: ResolvedAtom, db: Database, target_root: string) {
        return this.installPackages([atom], db, target_root);
    }

    async installPackages(atoms: ResolvedAtom[], db: Database, target_root: string) {
        var need_ldconfig = false;
        for (const atom of atoms) {
            const pkgdesc: PackageDescription = await this.getPackageDescription(atom);
            console.log(`Installing ${atom.format()} ${pkgdesc.version.version} to ${target_root}`);
            if (atom.getCategory() != 'virtual') {
                const build_path = path.join(this.local_builds_path, atom.getCategory(), atom.getName() + "," + pkgdesc.version.version + ".tar.xz");

                // TODO this is awful
                if (this.remote_url && !fs.existsSync(build_path)) {
                    await new Promise((resolve, reject) => {
                        ((this.remote_url.protocol == 'https') ? https : http).get(new URL(`builds/${atom.getCategory()}/${atom.getName()},${pkgdesc.version.version}.tar.xz`, this.remote_url), async (response) => {
                            if (response.statusCode == 200) {
                                await fs.promises.mkdir(path.dirname(build_path), { recursive: true });
                                const stream = fs.createWriteStream(build_path);
                                response.pipe(stream);
                                stream.on('finish', function () {
                                    stream.close();
                                    resolve();
                                })
                            } else {
                                fs.promises.unlink(build_path);
                                reject(`Got ${response.statusCode} from repo while looking for ${atom.format()}`);
                            }
                        });
                    });
                }

                const rc = child_process.spawnSync('tar', ['xpJvf', build_path], {
                    cwd: target_root,
                    stdio: ['ignore', 'pipe', 'inherit']
                });
                if (rc.signal) throw `unpack killed by signal ${rc.signal}`;
                if (rc.status != 0) throw `unpack exited with failure status`;

                // begin file-based hooks

                for (const file of rc.stdout.toString().split('\n')) {
                    if (file.endsWith('.so')) {
                        need_ldconfig = true;
                    }
                }

                // end file-based hooks
            }
            if (pkgdesc.post_unpack_script) {
                // in case the post-unpack script needs it
                if (need_ldconfig) {
                    console.log("Running ldconfig...");
                    child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
                    need_ldconfig = false;
                }
                console.log(`Running post-unpack script for ${atom.format()}`);
                child_process.spawnSync('chroot', ['.', 'bash', '-c', pkgdesc.post_unpack_script], { stdio: 'inherit', cwd: target_root });
            }
            db.install(atom, pkgdesc.version);
        }
        db.commit();
        if (need_ldconfig) {
            console.log("Running ldconfig...");
            child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
        }
    }
};

export class PackageDescription {
    comp: string;
    src: string;
    src_url: string;
    additional_sources: string[];
    unpack_dir: string;
    bdepend: Atom[];
    rdepend: Atom[];
    use_build_dir: boolean;
    configure: string;
    make: string;
    install: string;
    pre_configure_script: string;
    post_install_script: string;
    post_unpack_script: string;
    queue_hooks: object;
    version: PackageVersion;
    license: string;
    license_location: string

    // Whether the terms of the license allow distributing the software in
    // source and/or binary forms, with inclusion of their original license
    // terms, with the original source code available, as part of an
    // aggregate. Some software that is part of the Digitalis Linux
    // distribution is licensed under more-permissive terms than that, but in
    // this case we're going to distribute source + original license for all
    // of those packages, so it's a good baseline. Packages marked
    // 'packageable' (the default) are allowed to be distributed in source
    // or binary forms through OS images or through the repository.
    packageable: boolean;

    // Whether the terms of the license allow distributing the software in
    // binary form, possibly with the requirement that the original source code
    // be made available, as a stand-alone package. This covers anything that
    // falls into the 'packageable' category, but also covers things like
    // linux-firmware that may not be distributable as part of an aggregate.
    // Packages marked 'redistributable' (the default) are allowed to be
    // distributed in source (where available) or binary forms through the
    // repository, but won't be included in OS images unless also 'packageable'.
    redistributable: boolean;

    constructor(raw_yaml: string) {
        const default_package = {
            comp: 'tar.xz',
            upstream_version: '%{version}',
            src: '%{filename}-%{upstream_version}.%{comp}',
            src_url: '%{upstream}/%{src}',
            unpack_dir: '%{filename}-%{upstream_version}',
            bdepend: [],
            rdepend: [],
            use_build_dir: false,
            configure_options: "--prefix=/usr %{additional_configure_options}",
            additional_configure_options: '',
            make_options: "-j56 %{additional_make_options}",
            additional_make_options: '',
            configure: "../%{unpack_dir}/configure %{configure_options}",
            make: "make %{make_options}",
            install: "make DESTDIR=/target_root install",
            pre_configure_script: null,
            post_install_script: null,
            post_unpack_script: null,
            queue_hooks: {},
            redistributable: true,
            packageable: true,
            // other options include "given\n<LICENSE TEXT>", "file <file>" and "spdx"
            // including a license expression in the package's 'license' field implies spdx
            // for my own memory: https://github.com/spdx/license-list-data/tree/master/text/<license>.txt
            license_location: 'from-package'
        };

        var yaml = YAML.parse(raw_yaml);

        const parsed_package = Object.assign(default_package, yaml);
        if (Config.getConfigKey('use_default_depends')) {
            parsed_package.bdepend.push('virtual/build-tools');
            parsed_package.rdepend.push('virtual/base-system');
        }

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

        this.comp = parsed_package.comp;
        this.src = parsed_package.src;
        this.src_url = parsed_package.src_url;
        this.unpack_dir = parsed_package.unpack_dir;
        this.bdepend = parsed_package.bdepend.map((depend: string) => ResolvedAtom.parse(depend));
        this.rdepend = parsed_package.rdepend.map((depend: string) => ResolvedAtom.parse(depend));
        this.use_build_dir = parsed_package.use_build_dir;
        this.configure = parsed_package.configure;
        this.make = parsed_package.make;
        this.install = parsed_package.install;
        this.pre_configure_script = parsed_package.pre_configure_script;
        this.post_install_script = parsed_package.post_install_script;
        this.post_unpack_script = parsed_package.post_unpack_script;
        this.queue_hooks = parsed_package.queue_hooks;
        this.version = new PackageVersion(parsed_package.version);
        this.license = parsed_package.license;
        this.license_location = parsed_package.license_location;
        this.additional_sources = parsed_package.additional_sources;
    }
}
