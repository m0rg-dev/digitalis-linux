import { BuildStep } from "./BuildStep";
import { Package } from "./package";

import * as fs from 'fs/promises';

export class SetupStep extends BuildStep {
    async run(pkg: Package) {
        console.error(`[${pkg.meta().name}] set up build-import`);

        // TODO this should probably be stored in the fs
        await fs.mkdir(pkg.treepath('build-import'));
        await fs.mkdir(pkg.treepath('build-import/bin'));
        await fs.writeFile(pkg.treepath('build-import/bin/pkg-config'), 
            "#!/bin/sh\npkg-config --env-only $@", {mode: 0o755});

        for(const imp of pkg._build_import) {
            console.error(`[${pkg.meta().name}] importing dependency: ${imp.meta().name}`);
            imp._init();
            await imp.link(pkg.treepath('build-import'));
        }

        process.env["PATH"] = `${pkg.treepath('build-import/bin/')}`;
        process.env["CFLAGS"] = `-sysroot ${pkg.treepath('build-import/')}`;
    }
}