import { Atom, old_Atom, PackageVersion } from "./Atom.js";
import * as YAML from 'yaml';
import { Config } from "./Config.js";

export class PackageDescription {
    comp: string;
    src: string;
    src_url: string;
    additional_sources: string[];
    unpack_dir: string;
    bdepend: Atom[];
    rdepend: Atom[];
    use_default_depends: boolean;
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
    license_location: string;

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
            use_default_depends: true,
            use_build_dir: false,
            configure_options: "--prefix=/usr %{additional_configure_options}",
            additional_configure_options: '',
            make_options: "-j48 %{additional_make_options}",
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
        if (Config.use_default_depends && parsed_package.use_default_depends) {
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
        this.bdepend = parsed_package.bdepend;
        this.rdepend = parsed_package.rdepend;
        this.use_default_depends = parsed_package.use_default_depends;
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
