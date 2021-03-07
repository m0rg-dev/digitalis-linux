import Logger from "./Logger";
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as child_process from 'child_process';
import * as os from 'os';
import base32 from 'base32';
import { Package, Paths } from "./Package";

const build_order = [
    "preclean",
    "fetch",
    "unpack",
    "configure",
    "make",
    "install",
    "cleanup"
];

export type pkgmeta = {
    name?: string,
    version: string,
    release: number,
    summary: string,
    license: string,
    url: string,
    description?: string,
    nocache?: boolean,
    workdir?: () => string
};

export type pkgsrc = {
    url: string,
    filename?: string,
    sha256: string
};

export default abstract class Spec {
    _steps: { [key: string]: BuildStep } = {
        "preclean": new PreCleanStep(),
        "fetch": new FetchStep(),
        "unpack": new UnpackStep(),
        "configure": new AutoconfStep(),
        "make": new MakeStep(),
        "install": new MakeInstallStep()
    };

    _pre_hooks: { [key: string]: BuildStep[] } = {
        "fetch": [
            new ImportDependenciesStep(),
            /* new SetupStep() */
        ]
    };

    _post_hooks: { [key: string]: BuildStep[] } = {
        "install": [
            new FindPathsStep()
            /* new LinkFilterStep(),
            new FindLinksStep() */
        ],
        "cleanup": [
            /* new MarkCompleteStep() */
        ]
    };

    paths: Paths = {
        binaries: [],
        shared_libraries: [],
        headers: [],
        pkg_config: []
    };

    export_paths: Paths = {
        binaries: [],
        shared_libraries: [],
        headers: [],
        pkg_config: []
    };

    built_against: string[] = [];

    // -----

    abstract meta(): pkgmeta;

    srcs(): pkgsrc[] {
        return [];
    }

    steps(): { [key: string]: BuildStep } {
        return {};
    }

    pre_hooks(): { [key: string]: BuildStep[] } {
        return {};
    }

    post_hooks(): { [key: string]: BuildStep[] } {
        return {};
    }

    dependencies(): Spec[] {
        return [];
    }

    build_dependencies(): Spec[] {
        return [];
    }

    // -----

    get_meta(): pkgmeta {
        const rc = this.meta();
        if (!rc.name) rc.name = this.constructor.name;
        if (!rc.workdir) rc.workdir = () => path.join(this.root() + "/src", `${(this.meta().name || this.constructor.name).toLowerCase()}-${this.meta().version}`);
        return rc;
    }

    private _src_hash: string;

    src_hash(): string {
        if (this._src_hash) return this._src_hash;
        const src_hash_obj = crypto.createHash('sha256');
        for (const prop in this) {
            if (typeof this[prop] == 'function') {
                src_hash_obj.update(`prop = ${this[prop]}`);
            }
        }
        return this._src_hash = base32.encode(src_hash_obj.digest());
    }

    fqn(): string {
        return `${this.get_meta().name}-${this.get_meta().version}-${this.get_meta().release}`;
    }

    hfqn(): string {
        return `${this.src_hash().substr(0, 16)}-${this.fqn()}`;
    }

    root(): string {
        return path.join('/x10', 'tree', this.hfqn());
    }

    async build() {
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

    loadEnvironment() {
        process.env["PATH"] = this.paths.binaries.join(":");
        process.env["CFLAGS"] = `--sysroot ${this.root()} -O2 -pipe `
            + this.paths.headers.map((h) => `-isystem ${h}`).join(" ");
        process.env["LDFLAGS"] = `-Wl,-z,nodefaultlib `
            + (this.paths.shared_libraries.length ? `-Wl,-rpath,${this.paths.shared_libraries.join(":")} ` : "")
            + this.paths.shared_libraries.map((s) => `-L ${s}`).join(" ")
            + (this.paths.dynamic_linker?.length ? ` -Wl,-I${this.paths.dynamic_linker[this.paths.dynamic_linker.length - 1]}` : "");
        process.env["PKG_CONFIG_LIBDIR"] = this.paths.pkg_config.join(":");
    }

    async spawn(command: string, args: string[], options: child_process.SpawnOptions = {}): Promise<child_process.ChildProcess> {
        options = JSON.parse(JSON.stringify(options));
        if (!options.cwd) options.cwd = process.cwd();
        if (!options.stdio) options.stdio = 'inherit';
        await fs.access(options.cwd);
        this.loadEnvironment();
        Logger.log('info', this.fqn(), `spawn ${command} ${args.join(" , ")}`);
        const proc = child_process.spawn(command, args, options);
        return new Promise((resolve, reject) => {
            if (proc.stdout) {
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

export abstract class BuildStep {
    abstract run(spec: Spec): Promise<void>;
}

export class PreCleanStep extends BuildStep {
    async run(spec: Spec) {
        Logger.log('info', spec.fqn(), "Step: PreClean");
        await fs.mkdir(path.dirname(spec.root()), { recursive: true });
        await fs.rmdir(spec.root(), { recursive: true });
        await fs.mkdir(spec.root(), { recursive: true });
        await fs.mkdir(spec.get_meta().workdir(), { recursive: true });
    }
}

export class CreateSymlinkStep extends BuildStep {
    link_name: string;
    target: string;

    constructor(link_name: string, target: string) {
        super();
        this.link_name = link_name;
        this.target = target;
    }

    async run(spec: Spec) {
        Logger.log('info', spec.fqn(), `Step: CreateSymlink ${this.link_name} -> ${this.target}`);
        await fs.mkdir(path.join(spec.root(), path.dirname(this.link_name)), { recursive: true });
        await fs.symlink(this.target, path.join(spec.root(), this.link_name));
    }
}

export class FindPathsStep extends BuildStep {
    static async _check_path(path: string): Promise<boolean> {
        try {
            await fs.access(path);
            return true;
        } catch (e) {
            if (e.code == 'ENOENT') return false;
            throw e;
        }
    }

    async run(spec: Spec) {
        Logger.log('info', spec.fqn(), "Step: FindPaths");
        if (await FindPathsStep._check_path(path.join(spec.root(), 'bin'))) spec.export_paths.binaries.push(path.join(spec.root(), 'bin'));
        if (await FindPathsStep._check_path(path.join(spec.root(), 'lib'))) spec.export_paths.shared_libraries.push(path.join(spec.root(), 'lib'));
        if (await FindPathsStep._check_path(path.join(spec.root(), 'lib', 'pkgconfig'))) spec.export_paths.pkg_config.push(path.join(spec.root(), 'lib', 'pkgconfig'));
        if (await FindPathsStep._check_path(path.join(spec.root(), 'include'))) spec.export_paths.headers.push(path.join(spec.root(), 'include'));
    }
}

export class MergePathsStep extends BuildStep {
    src: Paths;
    constructor(src: Paths) {
        super();
        this.src = src;
    }

    async run(spec: Spec) {
        Logger.log('info', spec.fqn(), "Step: MergePaths");
        for (const key in this.src) {
            if (!spec.export_paths[key]) spec.export_paths[key] = [];
            spec.export_paths[key].push(...this.src[key]);
        }
    }
}

export class FetchStep extends BuildStep {
    async run(spec: Spec) {
        Logger.log('info', spec.fqn(), "Step: Fetch");
        await Promise.all(spec.srcs().map(async (src) => {
            const file = src.filename || path.join(path.join("/x10/sources", spec.fqn(), path.basename(src.url)));
            let local_good = false;
            await fs.stat(file).then(async () => {
                const contents = await fs.readFile(file);
                const hash = crypto.createHash('sha256');
                hash.update(contents);
                if (base32.encode(hash.digest()) == src.sha256) {
                    Logger.log('info', spec.fqn() + ` fetch ${file}`, "local copy is good");
                    local_good = true;
                } else {
                    Logger.log('info', spec.fqn() + ` fetch ${file}`, "local copy is bad, re-downloading");
                    await fs.unlink(file);
                }
            }, () => {
                Logger.log('info', spec.fqn() + ` fetch ${file}`, "downloading");
            });
            if (local_good) return;
            await fs.mkdir(path.dirname(file), { recursive: true });
            await spec.spawn("/usr/bin/curl", [
                "--progress-bar",
                "--location",
                "-o", file,
                src.url], { stdio: 'inherit' });

            const contents = await fs.readFile(file);
            const hash = crypto.createHash('sha256');
            hash.update(contents);
            const new_hash = base32.encode(hash.digest());
            Logger.log('info', spec.fqn() + ` fetch ${file}`, `hash: ${new_hash}`);
            if (new_hash != src.sha256) throw new Error(`${file} hash still doesn't match`);
        }));
    }
}

export class UnpackStep extends BuildStep {
    depth: number;

    constructor(depth = 1) {
        super();
        this.depth = depth;
    }

    async run(spec: Spec) {
        await Promise.all(spec.srcs().slice(0, this.depth).map(async (src) => {
            await fs.mkdir(spec.root() + "/src", { recursive: true });
            const file = src.filename || path.join(path.join("/x10/sources", spec.fqn(), path.basename(src.url)));
            console.error(`[${spec.get_meta().name}] unpacking: ${file}`);
            const basename = path.basename(file);
            if (basename.endsWith(".tar.gz")) {
                await this.untar("xfz", file, spec);
            } else if (basename.endsWith(".tar.xz")) {
                await this.untar("xfJ", file, spec);
            } else {
                throw new Error(`Unsupported compression format for ${file}`);
            }
        }));
    }

    private async untar(opts: string, file: string, spec: Spec) {
        await spec.spawn("tar", [opts, file, "-C", spec.root() + "/src"], { stdio: "inherit" });
    }
}

export class GenericCommandStep extends BuildStep {
    command: string;
    args: string[];

    constructor(command: string, args: string[]) {
        super();
        this.command = command;
        this.args = args;
    }

    async run(spec: Spec) {
        console.error(`[${spec.get_meta().name}] ${this.command} ${this.args.join(" ")}`);
        const workdir = spec.get_meta().workdir();
        await fs.access(workdir);
        await spec.spawn(this.command, this.args,
            { cwd: workdir, stdio: "inherit" });
    }
}

export class MakeStep extends GenericCommandStep {
    constructor() {
        super("make", [`-j${os.cpus().length}`]);
    }
}

export class MakeInstallStep extends GenericCommandStep {
    constructor() {
        super("make", ["install"]);
    }
}

export class ImportDependenciesStep extends BuildStep {
    async run(spec: Spec) {
        Logger.log('info', spec.fqn(), `Step: ImportDependencies`);
        for (const dep of spec.build_dependencies()) {
            Logger.log('info', spec.fqn(), `Importing: ${dep.fqn()}`);
            const sub = await (new Package(dep)).build();

            for (const key in sub.paths) {
                spec.paths[key].push(...sub.paths[key]);
            }

            spec.built_against.push(`${sub.fqn}-${sub.build_hash}`);
        }
    }
}

export class AutoconfStep extends BuildStep {
    args: { [key: string]: string | ((spec: Spec) => string); } = {};
    path: string;

    constructor(args: { [key: string]: string | ((spec: Spec) => string); } = {}, configure_path = "./configure") {
        super();
        this.path = configure_path;
        this.args["--prefix"] = (spec: Spec) => spec.root();
        this.args["--libdir"] = (spec: Spec) => path.join(spec.root(), "lib");
        for (const key in args) {
            this.args[key] = args[key];
        }
    }

    async run(spec: Spec) {
        Logger.log('info', spec.fqn(), `Step: Autoconf`);

        const args: string[] = [];
        for (const key in this.args) {
            if (this.args[key] === undefined) {
                args.push(key);
            } else {
                if (typeof this.args[key] == 'string') {
                    args.push(`${key}=${this.args[key]}`);
                } else if (typeof this.args[key] == 'function') {
                    args.push(`${key}=${(this.args[key] as ((spec: Spec) => string))(spec)}`);
                }
            }
        }
        Logger.log('info', spec.fqn(), `autoconf: ${this.path} ${args.join(" ")}`);
        await spec.spawn(this.path, args, {
            cwd: spec.get_meta().workdir(),
            stdio: "inherit"
        });
    }
}
