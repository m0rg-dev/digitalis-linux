import { PackageCategory, PackageName, ResolvedAtom, Atom, PackageVersion } from "./atom.js";
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import * as https from 'https';
import { URL } from "url";
import { Config } from "./config.js";
import { Manifest, ManifestPackage } from "./manifest";

export class Repository {
    private local_packages_path: string;
    private local_builds_path: string;
    private root_path: string;
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
                https.get(new URL(`packages/${atom.getCategory()}/${atom.getName()}.yml`, self.remote_url), (response) => {
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
                        https.get(new URL('Manifest.yml', self.remote_url), (response) => {
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
                    throw "Don't have local manifest and no remotes defined";
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
                const build = new ManifestPackage(pkg.atom, pkg.version,path.join(self.local_builds_path, pkg.atom.getCategory(), pkg.atom.getName() + "," + pkg.version.version + ".tar.xz"), data);
                manifest.addBuild(build);
            } catch (e) {
                // if we can't read the build it doesn't exist - this can happen
            }
        }));
        return fs.promises.writeFile(path.join(self.root_path, "Manifest.yml"), manifest.serialize());
    }

    async getSourceFor(pkg: PackageDescription): Promise<Buffer> {
        const manifest = await this.maybeUpdateManifest();
        const src = manifest.getSource(pkg.src);

        if(fs.existsSync(path.join(this.root_path, "sources", pkg.src))) {
            console.log(`Source ${path.join(this.root_path, "sources", pkg.src)} is available locally.`);
            return fs.promises.readFile(path.join(this.root_path, "sources", pkg.src));
        } else {
            throw `Source ${pkg.src} is not available locally (NYI in rpkg)`;
        }
    }
};

export class PackageDescription {
    comp: string;
    src: string;
    src_url: string;
    unpack_dir: string;
    bdepend: Atom[];
    rdepend: Atom[];
    use_build_dir: boolean;
    configure: string;
    make: string;
    install: string;
    pre_configure_script: string;
    post_install_script: string;
    queue_hooks: object;
    version: PackageVersion;
    license: string;

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
        this.queue_hooks = parsed_package.queue_hooks;
        this.version = new PackageVersion(parsed_package.version);
        this.license = parsed_package.license;
    }
}
