import * as child_process from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

import { Environment } from './Environment';

const build_order = [
    "import",
    "setup",
    "fetch",
    "unpack",
    "configure",
    "make",
    "install",
    "package"
];

export abstract class Spec {
    runtime_environment = new Environment([]);
    build_environment = new Environment([]);

    hash: string;

    abstract meta: {
        name?: string;
        version: string;
    };

    steps(): { [key: string]: BuildStep } { return {} };
    private _default_steps: { [key: string]: BuildStep } = {
        "import": new ImportEnvironmentStep(),
        "setup": new SetupStep(),
        "fetch": new FetchStep(),
        "unpack": new UnpackStep(),
        "configure": new ConfigureStep(),
        "make": new CommandStep("make", ["-j", os.cpus().length.toString()]),
        "install": new CommandStep("make", ["install"]),
        "package": new PackageStep()
    };

    post_hooks(): { [key: string]: BuildStep } { return {} };

    options(): { [key: string]: any } { return {} };
    private _default_options(): { [key: string]: any } {
        return {
            workdir: `src/${this.name().toLowerCase()}-${this.meta.version}`
        };
    };

    subpkgs(): Spec[] { return []; }
    _subpkgs(): Spec[] {
        return this.subpkgs().map(s => { s.meta.name = this.name() + "." + s.name(); return s; })
    }

    option(key: string): any {
        const opt = this.options();
        if (Object.getOwnPropertyNames(opt).some((x) => x == key)) return opt[key];
        return this._default_options()[key];
    }

    name(): string {
        return this.meta.name || this.constructor.name;
    }

    tree(): string {
        if (!this.hash) {
            return '/dev/null';
        }
        return `/x10/tree/${this.hash.substr(0, 16)}-${this.name()}-${this.meta.version}`;
    }

    pkg_env: { [key: string]: string } = {};

    async spawn(command: string, args: string[], options: child_process.SpawnOptions = {}): Promise<child_process.ChildProcess> {
        options = JSON.parse(JSON.stringify(options));
        if (!options.cwd) options.cwd = path.join(this.tree(), this.option('workdir'));
        if (!options.stdio) options.stdio = 'inherit';
        await fs.access(options.cwd);
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

    private static session_build_cache = new Set<string>();

    async build() {
        for (const step of build_order) {
            console.error(`[${step}]`);
            if (step in this.steps()) {
                if (this.steps()[step]) {
                    await this.steps()[step].run(this);
                }
            } else if (this._default_steps[step]) {
                await this._default_steps[step].run(this);
            }

            if (this.hash && Spec.session_build_cache.has(this.hash)) return;

            if(step in this.post_hooks()) {
                await this.post_hooks()[step].run(this);
            }
        }
        Spec.session_build_cache.add(this.hash);
    }
}

export interface BuildStep {
    run(src: Spec): Promise<void>;
}

export class CompositeStep implements BuildStep {
    steps: BuildStep[];

    constructor(steps: BuildStep[]) {
        this.steps = steps;
    }

    async run(src: Spec) {
        for (const step of this.steps) {
            await step.run(src);
        }
    }
}

export abstract class ScriptStep implements BuildStep {
    use_env: boolean;
    constructor(use_env = true) {
        this.use_env = use_env;
    }
    async run(src: Spec) {
        const script = this.script(src);
        await src.spawn("sh", ["-exc", script], {
            stdio: ['ignore', 'inherit', 'inherit'],
            env: this.use_env ? src.pkg_env : process.env,
            cwd: this.use_env ? path.join(src.tree(), src.option('workdir')) : process.cwd()
        });
    }
    abstract script(src: Spec): string;
}

export class ImportEnvironmentStep implements BuildStep {
    async run(src: Spec) {
        const this_hash = crypto.createHash('sha256');
        for (const prop in src) {
            if (typeof src[prop] == 'function') {
                this_hash.update(`${prop} = ${src[prop]}`);
            }
        }

        const build_env: Environment = src.option('setup')?.environment;
        if (build_env) {
            if (!(await build_env.resolve())) throw new Error(`Couldn't resolve environment for ${src.name()}!`);
            await build_env.construct();
            console.log(build_env);

            const env_hash = build_env.hash();
            this_hash.update(`env - ${env_hash}`);

            console.log(`setting pkg_env`);
            console.log(build_env.paths_to_env());
            src.pkg_env = build_env.paths_to_env();
            src.build_environment = build_env;
        }

        if (src.runtime_environment) {
            for (const dep of src.runtime_environment.dependencies) {
                this_hash.update(`dep - ${JSON.stringify(dep)}`);
            }
        }

        src.hash = this_hash.digest('hex');
        console.log(`hash is ${src.hash}`);
    }
}

export class SetupStep implements BuildStep {
    async run(src: Spec) {
        await fs.rmdir(src.tree(), { recursive: true });
        await fs.mkdir(src.tree(), { recursive: true });

        if (src.option('workdir')) await fs.mkdir(path.join(src.tree(), src.option('workdir')), { recursive: true });

        if (src.build_environment) {
            await fs.writeFile(src.tree() + "/build_lock.json", JSON.stringify(src.build_environment.lock()));
        }

        if (src.runtime_environment) {
            if (!(await src.runtime_environment.resolve())) throw new Error(`Couldn't resolve runtime environment for ${src.name()}!`);
            await src.runtime_environment.construct();
            await fs.writeFile(src.tree() + "/runtime.json", JSON.stringify(src.runtime_environment.lock()));
        }
    }
}

export class CommandStep implements BuildStep {
    command: string;
    args: string[];
    use_env: boolean;

    constructor(command: string, args: string[], use_env = true) {
        this.command = command;
        this.args = args;
        this.use_env = use_env;
    }

    async run(src: Spec) {
        await src.spawn(this.command, this.args, {
            env: this.use_env ? src.pkg_env : process.env,
            cwd: this.use_env ? path.join(src.tree(), src.option('workdir')) : process.cwd()
        });
    }
}

export class FetchStep extends ScriptStep {
    constructor() {
        super(false);
    }

    script = (src: Spec) => {
        if (src.option('fetch')?.srcs) {
            return `mkdir -pv ${src.tree()}/../srcs\n` +
                (src.option('fetch').srcs.map((url: { url: string, sha256: string }) =>
                    `test -e /x10/srcs/${path.basename(url.url)} || curl -L# ${url.url} -o /x10/srcs/${path.basename(url.url)}`
                ).join("\n"));
        } else {
            return '';
        }
    }
}

export class UnpackStep extends ScriptStep {
    constructor() {
        super(false);
    }

    script = (src: Spec) => {
        if (src.option('fetch')?.srcs) {
            return `mkdir -pv ${src.tree()}/src\n` +
                (src.option('fetch').srcs.map((url: { url: string, sha256: string }) =>
                    `tar axf /x10/srcs/${path.basename(url.url)} -C ${src.tree()}/src`
                ).join("\n"));
        } else {
            return '';
        }
    }
}

export class PackageStep extends ScriptStep {
    constructor() {
        super(false);
    }

    script = (src: Spec) => {
        return `mkdir -pv /x10/cache\n` +
            `tar cfz /x10/cache/${src.hash}-${src.name()}-${src.meta.version}-${Date.now()}.tar.gz --exclude=./src -C ${src.tree()} .`;
    }
}

export class ConfigureStep implements BuildStep {
    async run(src: Spec) {
        let configure: string;

        if (src.option('fetch')?.srcs) {
            configure = `${src.tree()}/src/${path.basename(src.option('fetch').srcs[0].url).replace(/\.tar\..+$/, "")}/configure`;
        }

        if (!configure) throw new Error("don't know how to configure");

        const opts = [
            "CFLAGS=-O2 -pipe " + Array.from(src.build_environment.paths.headers).map(h => `-isystem ${h}`).join(" "),
            "LDFLAGS=-Wl,-z,-nodefaultlib " + Array.from(src.build_environment.paths.libraries).map(l => `-L ${l} -Wl,-rpath,${l}`).join(" ")
            + (src.build_environment.paths.dynamic_linker ? ` -Wl,-I${src.build_environment.paths.dynamic_linker}` : ""),
            `--prefix=${src.tree()}`,
            `--libdir=${path.join(src.tree(), "lib")}`,
            ...(src.option('configure')?.additional_opts || [])
        ];
        console.error(`${src.name()} ${configure} ${opts.join(" , ")}`);
        await src.spawn(configure, opts, { env: src.pkg_env });
    }
}