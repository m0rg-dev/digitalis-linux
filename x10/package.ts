import * as fs from 'fs/promises';
import * as child_process from 'child_process';
import * as crypto from 'crypto';
import * as path from 'path';
import * as base32 from 'base32';
import * as step from './BuildStep';

export { step };

export type pkgmeta = {
    name: string,
    version: string,
    release: number,
    summary: string,
    license: string,
    url: string,
    description?: string
};

export type pkgsrc = {
    url: string,
    filename?: string,
    sha256: string
};

const build_order = [
    "preclean",
    "unpack",
    "configure",
    "make",
    "install",
    "cleanup"
];

export abstract class Package {
    _meta: pkgmeta;
    _srcs: pkgsrc[];
    _steps: { [key: string]: step.BuildStep } = {
        "preclean": new step.PreCleanStep(),
        "unpack": new step.UnpackStep(),
        "configure": new step.AutoconfStep(),
        "make": new step.MakeStep(),
        "install": new step.MakeInstallStep()
    };
    _build_import: Package[];
    _link_import: Package[];

    _pre_hooks: { [key: string]: step.BuildStep[] } = {
        "unpack": [
            new step.SetupStep()
        ]
    };

    _post_hooks: { [key: string]: step.BuildStep[] } = {
        "install": [
            new step.FindLinksStep()
        ]
    };

    _int_data: { [key: string]: any } = {};

    abstract meta(): pkgmeta;
    abstract srcs(): pkgsrc[];
    steps(): { [key: string]: step.BuildStep } {
        return {};
    }

    pre_hooks(): { [key: string]: step.BuildStep[] } {
        return {};
    }

    post_hooks(): { [key: string]: step.BuildStep[] } {
        return {};
    }

    build_import(): Package[] {
        return [];
    }

    link_import(): Package[] {
        return [];
    }

    _init() {
        this._meta = this.meta();
        this._srcs = this.srcs();
        this._build_import = this.build_import();
        this._link_import = this.link_import();

        for (const name in this.pre_hooks()) {
            if (!this._pre_hooks[name]) this._pre_hooks[name] = [];
            this._pre_hooks[name].push(...this.pre_hooks()[name]);
        }

        for (const name in this.steps()) {
            this._steps[name] = this.steps()[name];
        }

        for (const name in this.post_hooks()) {
            if (!this._post_hooks[name]) this._post_hooks[name] = [];
            this._post_hooks[name].push(...this.post_hooks()[name]);
        }

        this._int_data["env"] = process.env;
    }

    fqn(): string {
        return `${this.meta().name}-${this.meta().version}-${this.meta().release}`;
    }

    getLocalFile(src: pkgsrc) {
        if (src.filename) return src.filename;
        return path.join("/x10/cache", this.fqn(), path.basename(src.url));
    }

    async fetchSources() {
        return Promise.all(this._srcs.map(async (src) => {
            const file = this.getLocalFile(src);
            let local_good = false;
            await fs.stat(file).then(async () => {
                const contents = await fs.readFile(file);
                const hash = crypto.createHash('sha256');
                hash.update(contents);
                if (base32.encode(hash.digest()) == src.sha256) {
                    console.error(`[${this.meta().name}: ${file}] local copy is good`);
                    local_good = true;
                } else {
                    console.error(`[${this.meta().name}: ${file}] local copy is bad, re-downloading.`);
                    await fs.unlink(file);
                }
            }, () => {
                console.error(`[${this.meta().name}: ${file}] downloading.`);
            });
            if (local_good) return;
            await fs.mkdir(path.dirname(file), { recursive: true });
            const proc = child_process.spawn("curl", [
                "--progress-bar",
                "--location",
                "-o", file,
                src.url], { stdio: 'inherit' });
            await new Promise<void>((resolve, reject) => {
                proc.on('exit', (code, signal) => {
                    if (signal) reject(new Error(`curl killed by signal ${signal}`));
                    if (code) reject(new Error(`curl exited with code ${code}`));
                    resolve();
                });
            });

            const contents = await fs.readFile(file);
            const hash = crypto.createHash('sha256');
            hash.update(contents);
            console.error(`[${this.meta().name}: ${file}] hash: ${base32.encode(hash.digest())}`);
        }));
    }

    treepath(component = "") {
        return path.join("/x10/tree", this.fqn(), component);
    }

    async ensureTree() {
        const paths = [
            this.treepath("src")
        ]

        return Promise.all(paths.map((path) => fs.mkdir(path, { recursive: true })));
    }

    async build() {
        await this.fetchSources();

        for (const step of build_order) {
            if (this._pre_hooks[step]) {
                for (const hook of this._pre_hooks[step].reverse()) {
                    await hook.run(this);
                }
            }
            if (this._steps[step]) {
                await this._steps[step].run(this);
            }
            if (this._post_hooks[step]) {
                for (const hook of this._post_hooks[step].reverse()) {
                    await hook.run(this);
                }
            }
        }
    }

    async haveBuild(): Promise<boolean> {
        try {
            await fs.access(this.treepath());
            return true;
        } catch (e) {
            if (e.code == 'ENOENT') return false;
            throw e;
        }
    }

    async link(target_root: string) {
        await this.build();
        const links: Map<string, string> = this._int_data["links"] || new Map<string, string>();

        for (const [key, value] of links.entries()) {
            console.error(`linking: ${path.join(target_root, key)} -> ${value}`);
            await fs.mkdir(path.basename(path.join(target_root, key)), { recursive: true });
            await fs.symlink(value, path.join(target_root, key));
        }

        for (const imp of this._link_import) {
            imp._init();
            await imp.link(target_root);
        }
    }
};

