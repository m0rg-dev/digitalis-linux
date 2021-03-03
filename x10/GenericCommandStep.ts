import { BuildStep } from "./BuildStep";
import { Package } from "./package";

import * as child_process from 'child_process';

export class GenericCommandStep extends BuildStep {
    command: string;
    args: string[];

    constructor(command: string, args: string[]) {
        super();
        this.command = command;
        this.args = args;
    }

    async run(pkg: Package) {
        console.error(`[${pkg.meta().name}] ${this.command} ${this.args.join(" ")}`);
        const proc = child_process.spawn(this.command, this.args,
            { cwd: pkg.data.cwd, stdio: "inherit" });
        await new Promise<void>((resolve, reject) => {
            proc.on('exit', (code, signal) => {
                if (signal)
                    reject(new Error(`${this.command} killed by signal ${signal}`));
                if (code)
                    reject(new Error(`${this.command} exited with code ${code}`));
                resolve();
            });
        });
    }
}