import * as child_process from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Package } from './package';
import { ConfigureStep } from './BuildStep';

export class AutoconfStep extends ConfigureStep {
    args: { [key: string]: string | ((pkg: Package) => string); } = {};
    out_of_tree: boolean;

    constructor(args: { [key: string]: string | ((pkg: Package) => string); } = {}, out_of_tree = false) {
        super();

        this.args["--prefix"] = (pkg: Package) => pkg.treepath();
        this.args["--libdir"] = (pkg: Package) => pkg.treepath("lib");
        for (const key in args) {
            this.args[key] = args[key];
        }

        this.out_of_tree = out_of_tree;
    }

    async run(pkg: Package) {
        if(this.out_of_tree) {
            pkg.data.cwd = path.join(pkg.data.cwd, 'build');
            await fs.mkdir(pkg.data.cwd);
        }

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
        const proc = child_process.spawn((this.out_of_tree ? "." : "") + "./configure", args, {
            cwd: pkg.data.cwd,
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
