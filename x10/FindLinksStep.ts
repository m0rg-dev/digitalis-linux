import * as fs from 'fs/promises';
import * as path from 'path';

import { BuildStep } from "./BuildStep";
import { Package } from "./package";

export class FindLinksStep extends BuildStep {
    async run(pkg: Package) {
        console.error(`[${pkg.meta().name}] finding symlinks`);

        // binaries
        for (const binpath of ["bin", "sbin"]) {
            try {
                const dir = await fs.readdir(pkg.treepath(binpath));
                dir.forEach((ent) => {
                    pkg.data.links.set(path.join('/', binpath, ent), path.join(pkg.treepath(binpath), ent));
                });
            } catch (e) {
                if(e.code != 'ENOENT') throw e;
            }
        }

        // shared libraries
        try {
            const dir = await fs.readdir(pkg.treepath("lib"));
            dir.forEach((ent) => {
                if(ent.match(/\.so(?:\.\d+)*/)) {
                    pkg.data.links.set(path.join('/lib', ent), path.join(pkg.treepath('lib'), ent));
                }
            });
        } catch(e) {
            if(e.code != 'ENOENT') throw e;
        }

        // configuration files
        try {
            await fs.access(pkg.treepath("etc"));
            pkg.data.links.set(path.join('/etc', pkg.meta().name),pkg.treepath("etc"));
        } catch(e) {
            if(e.code != 'ENOENT') throw e;
        }

        console.error(`[${pkg.meta().name}] ${pkg.data.links.size} symlinks generated.`);
    }
}
