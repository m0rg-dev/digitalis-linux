"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageDescription = exports.Manifest = exports.ManifestObject = exports.Repository = void 0;
const atom_js_1 = require("./atom.js");
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const https = require("https");
const url_1 = require("url");
const config_js_1 = require("./config.js");
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
    async maybeUpdateManifest() {
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
                                resolve(Manifest.deserialize(raw_yml));
                            });
                        }
                        else {
                            reject(`Got ${response.statusCode} from repo while looking for Manifest.yml!`);
                        }
                    });
                });
            }
            else {
                throw "Don't have local manifest and no remotes defined";
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
        var manifest = new Manifest();
        self.getAllCategories(true)
            .then(async function (categories) {
            return Promise.all(categories.map(async function (category) {
                return self.getAllNames(category, true).then(names => names.map(name => [category, name]));
            }));
        }).then(async function (structured_names) {
            const all_names = structured_names.flat(1);
            return Promise.all(all_names.map(async (name) => {
                const atom = new atom_js_1.ResolvedAtom(name[0], name[1]);
                const desc = new PackageDescription(fs.readFileSync(path.join(self.local_packages_path, name[0], name[1] + ".yml")).toString('utf8'));
                return new ManifestObject(atom, desc.version);
            }));
        }).then(async function (all_packages) {
            all_packages.forEach((pkg) => manifest.addPackage(pkg));
            return Promise.all(all_packages.map(async (pkg) => {
                const err_1 = await new Promise((res, rej) => {
                    fs.access(path.join(self.local_builds_path, pkg.atom.getCategory(), pkg.atom.getName() + "," + pkg.version.version), fs.constants.R_OK, (err) => {
                        res(err);
                    });
                });
                if (!err_1)
                    manifest.addBuild(pkg);
            }));
        }).then(async function () {
            return new Promise((res, rej) => {
                fs.writeFile(path.join(self.root_path, "Manifest.yml"), manifest.serialize(), (err) => {
                    if (err)
                        rej(err);
                    else
                        res();
                });
            });
        });
    }
}
exports.Repository = Repository;
;
class ManifestObject {
    constructor(atom, version) {
        this.atom = atom;
        this.version = version;
    }
}
exports.ManifestObject = ManifestObject;
;
class Manifest {
    constructor() {
        this.builds = {};
        this.packages = {};
        this.categories = new Set();
    }
    addPackage(pkg) {
        this.packages[pkg.atom.format()] = pkg.version;
        this.categories.add(pkg.atom.getCategory());
    }
    addBuild(build) {
        this.builds[build.atom.format()] = build.version;
    }
    getPackage(key) {
        const v = this.packages[key.format()];
        if (v) {
            return new ManifestObject(key, v);
        }
        else {
            return undefined;
        }
    }
    getAllPackages() {
        var r = [];
        for (const formatted_atom in this.packages) {
            r.push(new ManifestObject(new atom_js_1.ResolvedAtom(formatted_atom), this.packages[formatted_atom]));
        }
        return r;
    }
    getBuild(key) {
        const v = this.builds[key.format()];
        if (v) {
            return new ManifestObject(key, v);
        }
        else {
            return undefined;
        }
    }
    getCategories() {
        return Array.from(this.categories.values());
    }
    static deserialize(yml) {
        return Object.assign(new Manifest(), YAML.parse(yml));
    }
    serialize() {
        this.serial = Math.trunc(Date.now() / 1000);
        return YAML.stringify(this);
    }
}
exports.Manifest = Manifest;
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
            install: "make DESTDIR=$(realpath ..) install",
            pre_configure_script: null,
            post_install_script: null,
            queue_hooks: {},
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
        this.queue_hooks = parsed_package.queue_hooks;
        this.version = new atom_js_1.PackageVersion(parsed_package.version);
    }
}
exports.PackageDescription = PackageDescription;
