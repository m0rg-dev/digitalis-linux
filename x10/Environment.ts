import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as child_process from 'child_process';
import { Spec } from './Spec';

export type EnvironmentDependency = {
    name?: string,
    version?: string,
    hash?: string,
    exact?: Spec
    pin?: 'name' | 'version' | 'hash'
};


export abstract class ResolvedDependency {
    runtime_environment: Environment = new Environment([]);
    fqn: EnvironmentDependency;

    abstract hash(): string;

    abstract construct(): Promise<void>;
    abstract tree(): string;
    static async enumerate(): Promise<ResolvedDependency[]> {
        return [];
    }
};


export class Environment {
    dependencies: EnvironmentDependency[];
    private resolution: ResolvedDependency[] = [];
    paths = {
        binaries: new Set(),
        libraries: new Set(),
        headers: new Set(),
        dynamic_linker: <string> undefined
    };

    constructor(dependencies: EnvironmentDependency[] = []) {
        this.dependencies = dependencies;
    }

    static tree_depth = 0;

    async resolve(): Promise<boolean> {
        const outstanding_dependencies = new Set<EnvironmentDependency>(this.dependencies);
        for (const dep of outstanding_dependencies) {
            console.error(`${' '.repeat(Environment.tree_depth)} -> ${dep.name} (${dep.exact ? `object ${dep.exact.name()}` : `v:${dep.version} h:${dep.hash}`})`);
            if (dep.exact) {
                const pkg = new BuiltPackage(dep.exact);
                const sub_env = pkg.runtime_environment;
                Environment.tree_depth++;
                if (await sub_env.resolve()) {
                    Environment.tree_depth--;
                    outstanding_dependencies.delete(dep);
                    this.resolution.push(...sub_env.resolution);
                    this.resolution.push(pkg);
                } else {
                    throw new Error("candidate did not resolve.");
                }
            } else {
                for (const pkg of [...(await Promise.all([CachedPackage, BuiltPackage].map((t): Promise<ResolvedDependency[]> => t.enumerate()))).flat()]) {
                    if (pkg.fqn.name == dep.name) {
                        const sub_env = pkg.runtime_environment;
                        Environment.tree_depth++;
                        if (await sub_env.resolve()) {
                            Environment.tree_depth--;
                            outstanding_dependencies.delete(dep);
                            this.resolution.push(...sub_env.resolution);
                            this.resolution.push(pkg);
                            break;
                        }
                        Environment.tree_depth--;
                    }
                }
            }
        }
        return (outstanding_dependencies.size == 0);
    }

    private async check_path(path: string): Promise<boolean> {
        try {
            await fs.access(path);
            return true;
        } catch (e) {
            if (e.code == 'ENOENT') return false;
            throw e;
        }
    }

    async construct() {
        for (const respkg of this.resolution) {
            console.error(`Constructing: ${respkg.fqn.name}`);
            await respkg.construct();
            if (await this.check_path(path.join(respkg.tree(), 'bin')))
                this.paths.binaries.add(path.join(respkg.tree(), 'bin'));
            if (await this.check_path(path.join(respkg.tree(), 'lib')))
                this.paths.libraries.add(path.join(respkg.tree(), 'lib'));
            if (await this.check_path(path.join(respkg.tree(), 'include')))
                this.paths.headers.add(path.join(respkg.tree(), 'include'));
            if (await this.check_path(path.join(respkg.tree(), 'lib64', 'ld-linux-x86-64.so.2')))
                this.paths.dynamic_linker = path.join(respkg.tree(), 'lib64', 'ld-linux-x86-64.so.2');
        }
    }

    lock(): EnvironmentDependency[] {
        const rc: EnvironmentDependency[] = [];
        for (const respkg of this.resolution) {
            rc.push({
                "name": respkg.fqn.name,
                "version": respkg.fqn.version,
                "hash": respkg.hash(),
                "pin": respkg.fqn.pin
            });
        }

        const jsons = new Set(rc.map(x => JSON.stringify(x)));
        
        return Array.from(jsons.values()).map(x => JSON.parse(x));
    }

    paths_to_env(): { [key: string]: string } {
        return {
            PATH: Array.from(this.paths.binaries).join(":")
        }
    }

    hash(): string {
        const digest = crypto.createHash('sha256');
        for (const respkg of this.resolution) {
            digest.update(respkg.fqn.name + " - " + respkg.hash());
        }
        return digest.digest('hex');
    }
};

export class CachedPackage extends ResolvedDependency {
    hash(): string {
        return this.fqn.hash;
    }
    tree(): string {
        return `/x10/tree/${this.fqn.hash.substr(0, 16)}-${this.fqn.name}-${this.fqn.version}`;
    }
    fqn: EnvironmentDependency = {};

    cache_path: string;
    built_at: number;

    constructor(cache_path: string) {
        super();
        const m = cache_path.match(/([0-9a-f]+)-(\w+)-([\w.]+)-(\d+)\.tar\.gz$/);
        this.fqn.hash = m[1];
        this.fqn.name = m[2];
        this.fqn.version = m[3];
        this.built_at = Number.parseInt(m[4]);
        this.cache_path = cache_path;

        const json = child_process.spawnSync('tar', ['xzf', `/x10/cache/${this.cache_path}`, '-O', './runtime.json']).output.join("");
        console.log(`${this.cache_path} ${json}`);
        // TODO?
        this.runtime_environment = new Environment(JSON.parse(json));
    }

    async construct() {
        await fs.rmdir(this.tree(), { recursive: true })
        await fs.mkdir(this.tree());
        const proc = child_process.spawn('tar', ['xzf', `/x10/cache/${this.cache_path}`, '-C', this.tree()], { stdio: 'inherit' });
        await new Promise((resolve, reject) => {
            proc.on('exit', (code, signal) => {
                if (signal)
                    reject(new Error(`tar killed by signal ${signal}`));
                if (code)
                    reject(new Error(`tar exited with code ${code}`));
                resolve(proc);
            });
        });
    }

    static async enumerate(): Promise<CachedPackage[]> {
        const files = await fs.readdir('/x10/cache/');
        const rc: CachedPackage[] = [];
        for (const path of files) {
            if (!path.endsWith('.tar.gz')) continue;
            rc.push(new CachedPackage(path));
        }
        console.log(rc);
        return rc.sort((a, b) => b.built_at - a.built_at);
    }
};

export class BuiltPackage extends ResolvedDependency {
    fqn: EnvironmentDependency;
    spec: Spec;

    private constructed = false;

    constructor(spec: Spec) {
        super();
        this.spec = spec;
        this.fqn = {
            name: spec.meta.name || spec.constructor.name,
            version: spec.meta.version
        };
        this.runtime_environment = this.spec.runtime_environment;
    }

    async construct() {
        await this.spec.build();
        this.constructed = true;
    }

    hash() {
        if (!this.constructed) throw new Error('call construct first');
        return this.spec.hash;
    }

    tree() {
        if (!this.constructed) throw new Error('call construct first');
        return this.spec.tree();
    }

    static async instantiate(path: string): Promise<Spec> {
        const clazz = await import(path);
        try {
            const pkg = new clazz.default;
            return pkg;
        } catch (e) {
            console.error(`-!- Couldn't load ${path}: ${e}`);
            return undefined;
        }
    }

    static async enumerate(): Promise<BuiltPackage[]> {
        const files = await fs.readdir(__dirname + '/pkgs/');
        const rc: BuiltPackage[] = [];
        for (const path of files) {
            if (path.endsWith('.js')) {
                const pkg = await BuiltPackage.instantiate(__dirname + '/pkgs/' + path);
                if (pkg) {
                    rc.push(new BuiltPackage(pkg));
                    rc.push(...(pkg._subpkgs().map(s => new BuiltPackage(s))));
                }
            }
        }
        return rc;
    }
}

