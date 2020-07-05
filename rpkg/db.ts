import { PackageCategory, PackageName, ResolvedAtom, SingleVersionAtom, Atom } from "./atom.js";
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import * as YAML from 'yaml';

export class Database {
    private database_path: string

    constructor(database_path: string) {
        this.database_path = database_path;
    }

    async getAllCategories(): Promise<PackageCategory[]> {
        return new Promise<PackageCategory[]>((res, rej) => {
            fs.readdir(this.database_path, { withFileTypes: true }, function (err, files) {
                if (err) {
                    rej(err);
                } else {
                    res(files.filter(file => file.isDirectory()).map(file => file.name));
                }
            });
        });
    }

    async getAllNames(c: PackageCategory): Promise<PackageName[]> {
        return new Promise<PackageName[]>((res, rej) => {
            fs.readdir(path.join(this.database_path, c), function (err, files) {
                if (err) {
                    rej(err);
                } else {
                    res(Array.from((new Set(files.map(file => file.split('@')[0])).values())));
                }
            });
        });
    }

    async getAllVersions(atom: ResolvedAtom): Promise<SingleVersionAtom[]> {
        return new Promise<SingleVersionAtom[]>((res, rej) => {
            fs.readdir(path.join(this.database_path, atom.getCategory()), function (err, files) {
                if (err) {
                    rej(err);
                } else {
                    const versions = files.map(file => {
                        const match = /(.*)@(.*).yml$/.exec(file);
                        if (!match) {
                            throw `${file} doesn't match package file regex!`;
                        }
                        if (match[1] === atom.getName()) {
                            return match[2];
                        }
                        return undefined;
                    }).filter(x => x != undefined).map(x => new semver.SemVer(x));
                    res(versions.filter(version => semver.satisfies(version, atom.getVersions()))
                        .map(version => new SingleVersionAtom(atom.getCategory(), atom.getName(), version)));
                }
            });
        });
    }

    async getPackageDescription(atom: SingleVersionAtom): Promise<PackageDescription> {
        return new Promise<PackageDescription>((res, rej) => {
            fs.readFile(path.join(this.database_path, atom.getCategory(), atom.getName() + "@" + atom.getVersion().version + ".yml"),
                function (err, data) {
                    if(err) {
                        rej(err);
                    } else {
                        res(new PackageDescription(data.toString('utf8')));
                    }
                });
        });
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
            install: "make DESTDIR=$(realpath ..) install",
            pre_configure_script: null,
            post_install_script: null,
            queue_hooks: {},
        };

        var yaml = YAML.parse(raw_yaml);

        const parsed_package = Object.assign(default_package, yaml);
        // TODO
        //if (rpkg_config.use_default_depends) {
        //    parsed_package.bdepend.push('virtual/build-tools');
        //    parsed_package.rdepend.push('virtual/base-system');
        //}

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
    }
}