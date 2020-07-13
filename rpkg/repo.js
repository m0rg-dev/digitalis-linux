"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageDescription = exports.Repository = void 0;
const atom_js_1 = require("./atom.js");
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const https = require("https");
const child_process = require("child_process");
const url_1 = require("url");
const config_js_1 = require("./config.js");
const manifest_1 = require("./manifest");
const byteSize = require("byte-size");
class Repository {
    constructor(root_path, remote_url) {
        this.local_packages_path = path.join(root_path, "packages");
        this.local_builds_path = path.join(root_path, "builds");
        this.root_path = root_path;
        this.remote_url = remote_url;
        this.manifest_fetched_already = false;
    }
    async getAllCategories(local) {
        if (local) {
            return new Promise((res, rej) => {
                fs.readdir(this.local_packages_path, { withFileTypes: true }, function (err, files) {
                    if (err) {
                        rej(err);
                    }
                    else {
                        res(files.filter(file => file.isDirectory()).map(file => file.name));
                    }
                });
            });
        }
        else {
            return this.maybeUpdateManifest()
                .then((manifest) => {
                return manifest.getCategories();
            });
        }
    }
    async getAllNames(c, local) {
        if (local) {
            return new Promise((res, rej) => {
                fs.readdir(path.join(this.local_packages_path, c), function (err, files) {
                    if (err) {
                        rej(err);
                    }
                    else {
                        res(Array.from((new Set(files.map(file => file.split('.yml')[0])).values())));
                    }
                });
            });
        }
        else {
            const manifest = await this.maybeUpdateManifest();
            return Promise.resolve(manifest.getAllPackages()
                .filter((pkg) => pkg.atom.getCategory() == c)
                .map((pkg) => pkg.atom.getName()));
        }
    }
    async getPackageDescription(atom) {
        const self = this;
        const manifest = await self.maybeUpdateManifest();
        const pkg = manifest.getPackage(atom);
        if (!pkg) {
            throw `Couldn't find ${atom.format()} in Manifest.yml!`;
        }
        const package_path = path.join(this.local_packages_path, atom.getCategory(), atom.getName() + ".yml");
        var maybe_package;
        try {
            const raw_yml = await fs.promises.readFile(package_path);
            const tentative_package = new PackageDescription(raw_yml.toString('utf8'));
            if (tentative_package.version.version == pkg.version.version)
                maybe_package = tentative_package;
        }
        catch (err) {
            // this probably means the file doesn't exist so whatever
        }
        if (maybe_package)
            return Promise.resolve(maybe_package);
        if (self.remote_url) {
            return new Promise((resolve, reject) => {
                console.log(`Retrieving ${atom.format()} from remote server...`);
                https.get(new url_1.URL(`packages/${atom.getCategory()}/${atom.getName()}.yml`, self.remote_url), (response) => {
                    if (response.statusCode == 200) {
                        var raw_yml = "";
                        response.on('data', (data) => {
                            raw_yml += data.toString('utf8');
                        });
                        response.on('end', async () => {
                            await fs.promises.mkdir(path.dirname(package_path), { recursive: true });
                            await fs.promises.writeFile(package_path, raw_yml);
                            resolve(new PackageDescription(raw_yml));
                        });
                    }
                    else {
                        reject(`Got ${response.statusCode} from repo while looking for ${atom.format()}`);
                    }
                });
            });
        }
        else {
            throw `Have outdated or missing local ${atom.format()} and no remotes defined`;
        }
    }
    // TODO this is in desperate need of refactoring
    async maybeUpdateManifest() {
        const self = this;
        const manifest_path = path.join(self.root_path, "Manifest.yml");
        return fs.promises.access(manifest_path, fs.constants.R_OK)
            .then(async (ok) => {
            return fs.promises.readFile(manifest_path).then((data) => {
                const manifest = manifest_1.Manifest.deserialize(data.toString('utf8'));
                if (self.remote_url && !self.manifest_fetched_already) {
                    return undefined;
                }
                return manifest;
            });
        }, async (err) => undefined)
            .then(async (maybe_manifest) => {
            if (maybe_manifest)
                return maybe_manifest;
            if (self.remote_url) {
                return new Promise((resolve, reject) => {
                    console.log("Retrieving Manifest.yml from remote server...");
                    https.get(new url_1.URL('Manifest.yml', self.remote_url), (response) => {
                        if (response.statusCode == 200) {
                            var raw_yml = "";
                            response.on('data', (data) => {
                                raw_yml += data.toString('utf8');
                            });
                            response.on('end', async () => {
                                await fs.promises.writeFile(manifest_path, raw_yml);
                                self.manifest_fetched_already = true;
                                resolve(manifest_1.Manifest.deserialize(raw_yml));
                            });
                        }
                        else {
                            reject(`Got ${response.statusCode} from repo while looking for Manifest.yml!`);
                        }
                    });
                });
            }
            else {
                throw `Don't have local manifest and no remotes defined (${self.root_path})`;
            }
        });
    }
    async buildExists(atom) {
        return this.maybeUpdateManifest().then((manifest) => {
            return !!(manifest.getBuild(atom));
        });
    }
    async buildManifest() {
        const self = this;
        var manifest = new manifest_1.Manifest();
        const categories = await self.getAllCategories(true);
        const structured_names = await Promise.all(categories.map(async function (category) {
            return self.getAllNames(category, true).then(names => names.map(name => [category, name]));
        }));
        const all_names = structured_names.flat(1);
        const all_packages = await Promise.all(all_names.map(async (name) => {
            const atom = new atom_js_1.ResolvedAtom(name[0], name[1]);
            const raw_data = await fs.promises.readFile(path.join(self.local_packages_path, name[0], name[1] + ".yml"));
            const desc = new PackageDescription(raw_data.toString('utf8'));
            return new manifest_1.ManifestPackage(atom, desc.version, path.join(name[0], name[1] + ".yml"), raw_data);
        }));
        all_packages.forEach((pkg) => manifest.addPackage(pkg));
        await Promise.all(all_packages.map(async (pkg) => {
            try {
                const data = await fs.promises.readFile(path.join(self.local_builds_path, pkg.atom.getCategory(), pkg.atom.getName() + "," + pkg.version.version + ".tar.xz"));
                const build = new manifest_1.ManifestPackage(pkg.atom, pkg.version, path.join(self.local_builds_path, pkg.atom.getCategory(), pkg.atom.getName() + "," + pkg.version.version + ".tar.xz"), data);
                manifest.addBuild(build);
            }
            catch (e) {
                // if we can't read the build it doesn't exist - this can happen
            }
        }));
        return fs.promises.writeFile(path.join(self.root_path, "Manifest.yml"), manifest.serialize());
    }
    async getSource(source) {
        if (fs.existsSync(path.join(this.root_path, "sources", source))) {
            console.log(`Source ${path.join(this.root_path, "sources", source)} is available locally.`);
            return fs.promises.readFile(path.join(this.root_path, "sources", source));
        }
        else {
            throw `Source ${source} is not available locally (NYI in rpkg)`;
        }
    }
    async getSourceFor(pkg) {
        //const manifest = await this.maybeUpdateManifest();
        //const src = manifest.getSource(pkg.src);
        return this.getSource(pkg.src);
    }
    static run_build_stage(container_id, name, script) {
        console.log(`Running ${name}...`);
        const rc = child_process.spawnSync('buildah', ['run', container_id, 'sh', '-ec', script], { stdio: 'inherit' });
        if (rc.signal)
            throw `${name} killed by signal ${rc.signal}`;
        if (rc.status != 0)
            throw `${name} exited with failure status!`;
    }
    async buildPackage(atom, container_id) {
        var pkgdesc = await this.getPackageDescription(atom);
        child_process.spawnSync('buildah', ['config', '--workingdir', '/', container_id]);
        child_process.spawnSync('buildah', ['run', container_id, 'mkdir', '/target_root', '/build'], { stdio: 'inherit' });
        if (pkgdesc.additional_sources) {
            for (const source of pkgdesc.additional_sources) {
                const src = await this.getSource(source);
                child_process.spawnSync('buildah', ['run', container_id, 'sh', '-c', `cat >/${source}`], {
                    input: src,
                });
            }
        }
        if (pkgdesc.src) {
            var src = await this.getSourceFor(pkgdesc);
            console.log(src.length);
            console.log("Unpacking...");
            const tar_args_by_comp = {
                "tar.gz": "xz",
                "tar.bz2": "xj",
                "tar.xz": "xJ"
            };
            child_process.spawnSync('buildah', ['run', container_id, 'tar', tar_args_by_comp[pkgdesc.comp]], {
                input: src,
            });
        }
        if (pkgdesc.use_build_dir) {
            child_process.spawnSync('buildah', ['config', '--workingdir', '/build', container_id], { stdio: 'inherit' });
        }
        else {
            child_process.spawnSync('buildah', ['config', '--workingdir', path.join("/", pkgdesc.unpack_dir), container_id], { stdio: 'inherit' });
        }
        if (pkgdesc.pre_configure_script)
            Repository.run_build_stage(container_id, "pre-configure script", pkgdesc.pre_configure_script);
        if (pkgdesc.configure)
            Repository.run_build_stage(container_id, "configure", pkgdesc.configure);
        if (pkgdesc.make)
            Repository.run_build_stage(container_id, "make", pkgdesc.make);
        if (pkgdesc.install)
            Repository.run_build_stage(container_id, "make install", pkgdesc.install);
        child_process.spawnSync('buildah', ['config', '--workingdir', '/target_root', container_id]);
        if (pkgdesc.post_install_script)
            Repository.run_build_stage(container_id, "post-install script", pkgdesc.post_install_script);
        // TODO autodetect
        if (pkgdesc.queue_hooks['ldconfig'])
            Repository.run_build_stage(container_id, "ldconfig", "ldconfig -N -r .");
        console.log("Compressing...");
        // TODO these should pipe to each other but I'm lazy
        const tar = child_process.spawnSync('buildah', ['run', container_id, 'tar', 'cp', '.'], {
            maxBuffer: 2 * 1024 * 1024 * 1024 // 2 GiB
        });
        if (tar.signal)
            throw `tar killed by signal ${tar.signal}`;
        if (tar.status != 0)
            throw "tar exited with failure status!";
        console.log(`  Package is ${byteSize(tar.stdout.length)}.`);
        const xz = child_process.spawnSync('xz', ['-T0', '-c'], {
            input: tar.stdout,
            maxBuffer: 2 * 1024 * 1024 * 1024 // 2 GiB
        });
        console.log(`  Compressed package is ${byteSize(xz.stdout.length)}.`);
        const target_path = path.join(this.local_builds_path, atom.getCategory(), atom.getName() + "," + pkgdesc.version.version + ".tar.xz");
        console.log(`Writing to ${target_path}...`);
        if (!fs.existsSync(path.dirname(target_path)))
            fs.mkdirSync(path.dirname(target_path), { recursive: true });
        fs.writeFileSync(target_path, xz.stdout);
        console.log('Cleaning up (in build container)...');
        child_process.spawnSync('buildah', ['run', container_id, 'rm', '-rf', '/target_root', '/build', pkgdesc.unpack_dir], { stdio: 'inherit' });
    }
    async installPackage(atom, db, target_root) {
        const pkgdesc = await this.getPackageDescription(atom);
        console.log(`Installing ${atom.format()} ${pkgdesc.version.version}`);
        if (atom.getCategory() != 'virtual') {
            const build_path = path.join(this.local_builds_path, atom.getCategory(), atom.getName() + "," + pkgdesc.version.version + ".tar.xz");
            const rc = child_process.spawnSync('tar', ['xpJf', build_path], {
                cwd: target_root,
                stdio: 'inherit'
            });
            if (rc.signal)
                throw `unpack killed by signal ${rc.signal}`;
            if (rc.status != 0)
                throw `unpack exited with failure status`;
            // TODO this shouldn't go here
            if (pkgdesc.queue_hooks['ldconfig']) {
                console.log("Running ldconfig...");
                child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
            }
        }
        if (pkgdesc.post_unpack_script) {
            console.log(`Running post-unpack script for ${atom.format()}`);
            child_process.execSync(pkgdesc.post_unpack_script, { stdio: 'inherit', cwd: target_root });
        }
        db.install(atom, pkgdesc.version);
        db.commit();
    }
}
exports.Repository = Repository;
;
class PackageDescription {
    constructor(raw_yaml) {
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
        if (config_js_1.Config.getConfigKey('use_default_depends')) {
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
        this.bdepend = parsed_package.bdepend.map((depend) => atom_js_1.ResolvedAtom.parse(depend));
        this.rdepend = parsed_package.rdepend.map((depend) => atom_js_1.ResolvedAtom.parse(depend));
        this.use_build_dir = parsed_package.use_build_dir;
        this.configure = parsed_package.configure;
        this.make = parsed_package.make;
        this.install = parsed_package.install;
        this.pre_configure_script = parsed_package.pre_configure_script;
        this.post_install_script = parsed_package.post_install_script;
        this.post_unpack_script = parsed_package.post_unpack_script;
        this.queue_hooks = parsed_package.queue_hooks;
        this.version = new atom_js_1.PackageVersion(parsed_package.version);
        this.license = parsed_package.license;
        this.additional_sources = parsed_package.additional_sources;
    }
}
exports.PackageDescription = PackageDescription;
