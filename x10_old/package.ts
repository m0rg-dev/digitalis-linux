import * as fs from 'fs/promises';
import * as child_process from 'child_process';
import * as crypto from 'crypto';
import * as path from 'path';
import * as base32 from 'base32';
import * as step from './BuildStep';
import { Config, ResolutionMode } from './Config';

export { step };

export type pkgmeta = {
    name?: string,
    version: string,
    release: number,
    summary: string,
    license: string,
    url: string,
    description?: string
    nocache?: boolean
};

export type pkgsrc = {
    url: string,
    filename?: string,
    sha256: string
};

export type cachemeta = {
    builder: string,
    built_at: number,
    hash: string,
    fqn: string,
    imported_at_build: string[],
    link_import: string[]
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
    _initialized = false;
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
            new step.LinkFilterStep(),
            new step.FindLinksStep()
        ],
        "cleanup": [
            new step.MarkCompleteStep()
        ]
    };

    imported: Package[] = [];
    // _int_data: { [key: string]: any } = {};
    data = {
        setup: {
            system_include_paths: [],
            library_paths: [],
            dynamic_linker: undefined
        },
        links: new Map<string, string>(),
        cwd: process.cwd()
    };

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

    on_import(importer: Package) { }
    _import(importer: Package) {
        this.on_import(importer);
        importer.imported.push(this);
        // TODO this could be more generic
        importer.data.setup.system_include_paths.push(...this.data.setup.system_include_paths);
        importer.data.setup.library_paths.push(...this.data.setup.library_paths);
    }

    link_import(): Package[] {
        return [];
    }

    async link_filter(importer: Package): Promise<boolean> {
        return true;
    }

    get_meta(): pkgmeta {
        const rc = this.meta();
        if (!rc.name) rc.name = this.constructor.name;
        return rc;
    }

    async _init() {
        if (this._initialized) return;

        this._meta = this.get_meta();
        this._srcs = this.srcs();
        this._build_import = this.build_import();
        this._link_import = this.link_import();

        await this.hash();

        this._initialized = true; // avoid potential recursion

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
    }

    fqn(): string {
        return `${this.get_meta().name}-${this.get_meta().version}-${this.get_meta().release}`;
    }

    async hfqn(): Promise<string> {
        return `${await this.hash()}-${this.fqn()}`;
    }

    getLocalFile(src: pkgsrc) {
        if (src.filename) return src.filename;
        return path.join("/x10/sources", this.fqn(), path.basename(src.url));
    }

    treepath(component = "") {
        if (!this._hash) throw new Error("call _init first");
        return path.join("/x10/tree", `${this._hash.substr(0, 16)}-${this.fqn()}`, component);
    }

    cachepath() {
        return path.join(`/x10/cache/${this._hash.substr(0, 16)}-${this.fqn()}.tar.gz`);
    }

    // TODO this should be a BuildStep
    async fetchSources() {
        return Promise.all(this._srcs.map(async (src) => {
            const file = this.getLocalFile(src);
            let local_good = false;
            await fs.stat(file).then(async () => {
                const contents = await fs.readFile(file);
                const hash = crypto.createHash('sha256');
                hash.update(contents);
                if (base32.encode(hash.digest()) == src.sha256) {
                    console.error(`[${this.get_meta().name}: ${file}] local copy is good`);
                    local_good = true;
                } else {
                    console.error(`[${this.get_meta().name}: ${file}] local copy is bad, re-downloading.`);
                    await fs.unlink(file);
                }
            }, () => {
                console.error(`[${this.get_meta().name}: ${file}] downloading.`);
            });
            if (local_good) return;
            await fs.mkdir(path.dirname(file), { recursive: true });
            const proc = child_process.spawn("/usr/bin/curl", [
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
            console.error(`[${this.get_meta().name}: ${file}] hash: ${base32.encode(hash.digest())}`);
        }));
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

        if (!this.get_meta().nocache) await this.cacheBuild();
    }

    async cacheBuild() {
        const link_import = this.imported;
        const meta: cachemeta = {
            builder: "",
            built_at: new Date().getTime(),
            hash: await this.hash(),
            fqn: this.fqn(),
            imported_at_build: await Promise.all(this.imported.map((i) => i.hfqn())),
            link_import: await Promise.all(link_import.map((i) => i.hfqn())),
        };

        await fs.writeFile(this.treepath('meta'), JSON.stringify(meta));
        console.log(meta);
        await fs.mkdir(path.dirname(this.cachepath()), { recursive: true });
        await this.spawn("tar",
            ["cfz", this.cachepath(), "--exclude", "./src", "-C", this.treepath(), "."],
            { cwd: this.treepath() });
    }

    async haveBuild(): Promise<boolean> {
        try {
            await fs.access(this.treepath('meta'));
            return true;
        } catch (e) {
            if (e.code == 'ENOENT') return false;
            throw e;
        }
    }

    async isValidCache(path: string): Promise<cachemeta> {
        console.error(`[${this.fqn()}] checking cached: ${path}`);
        try {
            await fs.access(path)
        } catch (e) {
            if (e.code == 'ENOENT') {
                console.error(`  -> doesn't exist`);
                return undefined;
            }
            throw e;
        }
        const proc = await this.spawn("tar", ["xfz", path, "-O", './meta'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'inherit' ] });
        const meta: cachemeta = JSON.parse(Buffer.concat(proc["stdout_buf"]).toString());
        // check dependencies
        for(const dep of meta.link_import) {
            let [hash,...fqn] = dep.split('-');
            hash = hash.substr(0,16);
            if(!await this.isValidCache(`/x10/cache/${hash}-${fqn.join('-')}.tar.gz`)) return undefined;
        }
        console.error(`  -> checks out!`);
        return meta;
    }

    async haveValidCache(fqn = this.fqn(), resolution = Config.resolution): Promise<boolean> {
        const candidates = (resolution == ResolutionMode.EXACT)
            ? [`${this._hash.substr(0, 16)}-${this.fqn()}.tar.gz`]
            : (await fs.readdir("/x10/cache")).filter((s) => s.match(new RegExp(`^[0-9a-z]{16}-${this.fqn()}\.tar\.gz\$`)));
        console.log(candidates);
        const metas: cachemeta[] = [];
        for (const candidate of candidates) {
            let meta = await this.isValidCache(`/x10/cache/${candidate}`);
            if(meta) {
                metas.push(meta);
            }
        }
        if(metas.length) throw new Error('h');
        return false;
    }

    async link(target_root: string) {
        if (await this.haveValidCache()) {

        } else if (await this.haveBuild()) {
            console.error(`using existing ${this.get_meta().name} installation`);
            const link_cache = JSON.parse((await fs.readFile(this.treepath('link_cache'))).toString());
            for (const key in link_cache) {
                this.data.links.set(key, link_cache[key]);
            }
        } else {
            await this.build();
        }
        for (const [key, value] of this.data.links.entries()) {
            console.error(`linking: ${path.join(target_root, key)} -> ${value}`);
            await fs.mkdir(path.dirname(path.join(target_root, key)), { recursive: true });
            try {
                await fs.unlink(path.join(target_root, key));
            } catch (e) {
                if (e.code != 'ENOENT') throw e;
            }
            await fs.symlink(value, path.join(target_root, key));
        }

        for (const imp of this._link_import) {
            await imp._init();
            await imp.link(target_root);
            imp._import(this);
        }
    }

    _hash: string;

    async hash(): Promise<string> {
        if (this._hash) return this._hash;
        // hash of the package manager itself - comes out of .tsbuildinfo
        const hash = crypto.createHash('sha256');
        hash.update(await fs.readFile(path.join(__dirname, ".tsbuildinfo")));
        // hash of the package code itself (black magic)
        for (const prop in this) {
            if (typeof this[prop] == 'function') {
                hash.update(`prop = ${this[prop]}`);
            }
        }
        // hash of the package's dependencies
        for (const depend of this._build_import.values()) {
            await depend._init();
            hash.update(await depend.hfqn());
        }
        return this._hash = base32.encode(hash.digest());
    }

    async spawn(command: string, args: string[], options: child_process.SpawnOptions = {}): Promise<child_process.ChildProcess> {
        options = JSON.parse(JSON.stringify(options));
        if (!options.cwd) options.cwd = this.data.cwd || process.cwd();
        if (!options.stdio) options.stdio = 'inherit';
        await fs.access(options.cwd);
        const proc = child_process.spawn(command, args, options);
        return new Promise((resolve, reject) => {
            if(proc.stdout) {
                proc["stdout_buf"] = [];
                proc.stdout.on('data', (d) => proc["stdout_buf"].push(d));
            }
            proc.on('exit', (code, signal) => {
                if (signal)
                    reject(new Error(`${command} killed by signal ${signal}`));
                if (code)
                    reject(new Error(`${command} exited with code ${code}`));
                resolve(proc);
            });
        });
    }
};

