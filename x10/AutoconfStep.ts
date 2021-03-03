import * as child_process from 'child_process';
import { Package } from './package';
import { ConfigureStep } from './BuildStep';

export class AutoconfStep extends ConfigureStep {
    args: { [key: string]: string | ((pkg: Package) => string); } = {};

    constructor(args: { [key: string]: string | ((pkg: Package) => string); } = {}) {
        super();

        this.args["--prefix"] = (pkg: Package) => pkg.treepath();
        this.args["--libdir"] = (pkg: Package) => pkg.treepath("lib");
        for (const key in args) {
            this.args[key] = args[key];
        }
    }

    async run(pkg: Package) {
        const args: string[] = [];
        for (const key in this.args) {
            if (this.args[key] === undefined) {
                args.push(key);
            } else {
                if (typeof this.args[key] == 'string') {
                    args.push(`${key}=${this.args[key]}`);
                } else if (typeof this.args[key] == 'function') {
                    args.push(`${key}=${(this.args[key] as ((pkg: Package) => string))(pkg)}`);
                }
            }
        }
        console.error(`[${pkg.meta().name}] autoconf: ./configure ${args.join(" ")}`);
        const proc = child_process.spawn("./configure", args, {
            cwd: pkg._int_data['dir'],
            stdio: "inherit"
        });
        await new Promise<void>((resolve, reject) => {
            proc.on('exit', (code, signal) => {
                if (signal)
                    reject(new Error(`configure killed by signal ${signal}`));
                if (code)
                    reject(new Error(`configure exited with code ${code}`));
                resolve();
            });
        });
    }
}
