import { BuildStep } from "./BuildStep";
import { Package } from "./package";

import * as fs from 'fs/promises';

export class SetupStep extends BuildStep {
    async run(pkg: Package) {
        console.error(`[${pkg.get_meta().name}] set up build-import`);

        // TODO this should probably be stored in the fs
        await fs.mkdir(pkg.treepath('build-import'));
        await fs.mkdir(pkg.treepath('build-import/bin'));
        await fs.writeFile(pkg.treepath('build-import/bin/pkg-config'),
            "#!/bin/sh\n/usr/bin/pkg-config --env-only $@", { mode: 0o755 });

        const rpath: string[] = [];
        const pkgconfpath: string[] = [];
        for (const imp of pkg._build_import) {
            console.error(`[${pkg.get_meta().name}] importing dependency: ${imp.get_meta().name}`);
            imp._init();
            await imp.link(pkg.treepath('build-import'));
            imp._import(pkg);
            try {
                await fs.access(imp.treepath('lib'));
                rpath.push(imp.treepath('lib'))
            } catch (e) {
                if (e.code != 'ENOENT') throw e;
            }

            try {
                await fs.access(imp.treepath('lib/pkgconfig'));
                rpath.push(imp.treepath('lib/pkgconfig'))
            } catch (e) {
                if (e.code != 'ENOENT') throw e;
            }
        }

        process.env["PATH"] = `${pkg.treepath('build-import/bin/')}`;

        process.env["CFLAGS"] = `--sysroot ${pkg.treepath('build-import/')} -O2 -pipe `
            + pkg.data.setup.system_include_paths.map((s) => `-isystem ${s}`).join(" ");
        process.env["LDFLAGS"] = `-Wl,-z,nodefaultlib `
            + (rpath.length ? `-Wl,-rpath,${rpath.join(":")} ` : "")
            + pkg.data.setup.library_paths.map((s) => `-L ${s}`).join(" ")
            + (pkg.data.setup.dynamic_linker ? ` -Wl,-I${pkg.data.setup.dynamic_linker}` : "");
        process.env["PKG_CONFIG_LIBDIR"] = pkgconfpath.join(":");

        for (const env of ["PATH", "CFLAGS", "LDFLAGS"]) {
            console.error(`   env: ${env} = ${process.env[env]}`);
        }

        await fs.writeFile(pkg.treepath('env_cache'), Object.keys(process.env).map(k => `${k}="${process.env[k].replace(/"/g, "\\\"")}"`).join("\n"));
    }
}