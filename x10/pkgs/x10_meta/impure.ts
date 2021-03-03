import * as path from 'path';

import * as pkg from "../../package";

class ImpureLinkStep extends pkg.step.BuildStep {
    src_files: string[];
    constructor(src_files: string[]) {
        super();
        this.src_files = src_files;
    }

    async run(pkg: pkg.Package) {
        this.src_files.forEach((file) => {
            if(file.match(/\/bin\/\w+$/)) {
                pkg.data.links.set(path.join('/bin', path.basename(file)), file);
            } else {
                throw new Error(`Don't know where to put ${file}.`);
            }
        });
    }
}

export class ImpureDependency extends pkg.Package {
    name: string;
    src_files: string[];

    constructor(name: string, src_files: string[]) {
        super();
        this.name = name;
        this.src_files = src_files;
    }

    meta = (): pkg.pkgmeta => ({
        name: `__impure_${this.name}`,
        url: "",
        version: "0.1",
        release: 1,
        summary: "",
        license: "0BSD"
    });

    srcs = (): pkg.pkgsrc[] => [];

    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "configure": undefined,
        "make": undefined,
        "install": undefined
    });

    pre_hooks = (): { [key: string]: pkg.step.BuildStep[] } => ({
        "cleanup": [new ImpureLinkStep(this.src_files)]
    });
}