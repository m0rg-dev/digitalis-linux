import * as child_process from 'child_process';
import * as path from 'path';
import { Package } from './package';
import { BuildStep } from './BuildStep';

export class UnpackStep extends BuildStep {
    depth: number;
    unpack_dir: string;

    constructor(depth = 1, unpack_dir?: string) {
        super();
        this.depth = depth;
        this.unpack_dir = unpack_dir;
    }

    async run(pkg: Package) {
        await Promise.all(pkg._srcs.slice(0, this.depth).map(async (src) => {
            const file = pkg.getLocalFile(src);
            console.error(`[${pkg.get_meta().name}] unpacking: ${file}`);
            const basename = path.basename(file);
            if (basename.endsWith(".tar.gz")) {
                await this.untar("xfz", file, pkg);
            } else if(basename.endsWith(".tar.xz")) {
                await this.untar("xfJ", file, pkg);
            } else {
                throw new Error(`Unsupported compression format for ${file}`);
            }
        }));
        if (this.unpack_dir) {
            pkg.data.cwd = path.join(pkg.treepath("src"), this.unpack_dir);
        } else {
            pkg.data.cwd = path.join(pkg.treepath("src"), `${pkg.get_meta().name.toLowerCase()}-${pkg.meta().version}`);
        }
    }

    private async untar(opts: string, file: string, pkg: Package) {
        const proc = child_process.spawn("tar", [opts, file, "-C", pkg.treepath("src")], { stdio: "inherit" });
        await new Promise<void>((resolve, reject) => {
            proc.on('exit', (code, signal) => {
                if (signal)
                    reject(new Error(`tar killed by signal ${signal}`));
                if (code)
                    reject(new Error(`tar exited with code ${code}`));
                resolve();
            });
        });
    }
}
