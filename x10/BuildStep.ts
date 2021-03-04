import * as fs from 'fs/promises';
import * as child_process from 'child_process';
import * as os from 'os';
import { Package } from './package';

export abstract class BuildStep {
    abstract run(pkg: Package): Promise<void>;
}

export class PreCleanStep extends BuildStep {
    async run(pkg: Package) {
        console.error(`[${pkg.get_meta().name}] cleaning (pre)`);
        await fs.rmdir(pkg.treepath(), { recursive: true });
        await pkg.ensureTree();
    }
}

export abstract class ConfigureStep extends BuildStep { }

export class MakeStep extends BuildStep {
    parallel: boolean;

    constructor(parallel = true) {
        super();
        this.parallel = parallel;
    }

    async run(pkg: Package) {
        console.error(`[${pkg.get_meta().name}] make`);
        const proc = child_process.spawn("make",
            [this.parallel ? `-j${os.cpus().length}` : '-j1'],
            { cwd: pkg.data.cwd, stdio: "inherit" });
        await new Promise<void>((resolve, reject) => {
            proc.on('exit', (code, signal) => {
                if (signal)
                    reject(new Error(`make killed by signal ${signal}`));
                if (code)
                    reject(new Error(`make exited with code ${code}`));
                resolve();
            });
        });
    }
}

export class MakeInstallStep extends BuildStep {
    async run(pkg: Package) {
        console.error(`[${pkg.get_meta().name}] make install`);
        const proc = child_process.spawn("make",
            ['install'],
            { cwd: pkg.data.cwd, stdio: "inherit" });
        await new Promise<void>((resolve, reject) => {
            proc.on('exit', (code, signal) => {
                if (signal)
                    reject(new Error(`make install killed by signal ${signal}`));
                if (code)
                    reject(new Error(`make install exited with code ${code}`));
                resolve();
            });
        });
    }
}


export class MarkCompleteStep extends BuildStep {
    async run(pkg: Package) {
        console.error(`[${pkg.get_meta().name}] marking done`);
        const json = {};
        pkg.data.links.forEach((value, key) => json[key] = value);
        await fs.writeFile(pkg.treepath('link_cache'), JSON.stringify(json));
    }
}

import { UnpackStep } from './UnpackStep';
import { AutoconfStep } from './AutoconfStep';
import { FindLinksStep } from './FindLinksStep';
import { SetupStep } from './SetupStep';
import { GenericCommandStep } from './GenericCommandStep';

export { UnpackStep, AutoconfStep, FindLinksStep, SetupStep, GenericCommandStep };
