import * as child_process from "child_process";
import { Config } from "./Config";
import { BuildTargetDependency, Dependency, RPMDependency } from "./Dependency";
import { InstallStrategy } from "./InstallStrategy";
import { RPMCandidates, RPMDatabase } from "./RPMDatabase";
import * as uuid from "uuid";
import * as path from "path";
import { Logger } from "./Logger";

export abstract class Action {
    uuid: string;

    abstract necessary(): Promise<boolean>;
    abstract prerequisites(): Promise<Action[]>;
    abstract execute(): Promise<void>;

    abstract toString(): string;

    constructor() {
        this.uuid = uuid.v4();
    }

    async possible(): Promise<boolean> {
        return (await this.prerequisites()).length == 0;
    }

    static async prune(list: Action[]): Promise<Action[]> {
        return Promise.all(list.map(a => new Promise<Action[]>(async (resolve, reject) => {
            if (await a.necessary())
                resolve([a]);
            else
                resolve([]);
        }))).then(x => x.flat(1));
    }
}

export class ImageBuildAction extends Action {
    image: BuildTargetDependency;

    constructor(image: BuildTargetDependency) {
        super();
        this.image = image;
    }
    async necessary(): Promise<boolean> {
        const proc = child_process.spawn('podman', ['image', 'exists', this.image.target.runner_image]);
        return new Promise((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Process killed by signal ${signal}`);
                if (code > 1) reject(`Process exited with code ${code}`);
                if (code == 1) resolve(true);
                resolve(false);
            })
        });
    }
    async prerequisites(): Promise<Action[]> {
        return [];
    }
    execute(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    toString(): string {
        return `${this.uuid}: ImageBuildAction ${this.image.target.runner_image}`;
    }
}

export class PackageInstallAction extends Action {
    pkg: RPMDependency;
    strategy: InstallStrategy;
    container_uuid: string;
    static completion_cache: Set<string> = new Set();

    constructor(pkg: RPMDependency, strategy: InstallStrategy, container_uuid: string) {
        super();
        this.pkg = pkg;
        this.strategy = strategy;
        this.container_uuid = container_uuid;
    }

    async necessary(): Promise<boolean> {
        return !PackageInstallAction.completion_cache.has(this.container_uuid + this.pkg.name);
    }

    async prerequisites(): Promise<Action[]> {
        return this.strategy.prerequisites(this.pkg, this.container_uuid);
    }

    async execute(): Promise<void> {
        await this.strategy.install(this.pkg, this.container_uuid);
        PackageInstallAction.completion_cache.add(this.container_uuid + this.pkg.name);
    }

    toString(): string {
        return `${this.uuid} PackageInstallAction ${this.pkg.name} ${this.strategy.name()} ${this.container_uuid}`;
    }
}

export class PackageBuildAction extends Action {
    spec: RPMCandidates;

    constructor(spec: RPMCandidates) {
        super();
        this.spec = spec;
    }
    
    async necessary(): Promise<boolean> {
        await RPMDatabase.get().then(d => d.read_specs());
        return !(await RPMDatabase.get()).lookup_rpm(this.spec.dist, this.spec.name).have_artifacts;
    }
    
    async prerequisites(): Promise<Action[]> {
        const deps = await RPMDatabase.get_build_dependencies(this.spec, (await Config.get()).build_targets[this.spec.dist]);
        const actions = await Dependency.resolve_dependency_list(deps, (await Config.get()).build_targets[this.spec.dist], this.uuid);
        return Action.prune(actions);
    }

    async execute(): Promise<void> {
        const target = (await Config.get()).build_targets[this.spec.dist];
        const proc = await target.run_in_container(this.uuid, ['rpmbuild', '--verbose', ...this.spec.options, '-ba', "/rpmbuild/SPECS/" + path.basename(this.spec.spec)], { stdio: 'pipe' });
        proc.stderr.on('data', (data) => {
            Logger.debug(`[${this.uuid} stderr] ${data}`);
        });
        proc.stdout.on('data', (data) => {
            Logger.debug(`[${this.uuid}] ${data}`);
        });
        return new Promise((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Process killed by signal ${signal}`);
                if (code) reject(`Process exited with code ${code}`);
                resolve();
            })
        });
    }

    toString(): string {
        return `${this.uuid} PackageBuildAction ${this.spec.name}`;
    }
}

