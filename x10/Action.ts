import path = require("path");
import { Config } from "./Config";
import { Container } from "./Container";
import { InstallPlan } from "./InstallPlan";
import { Logger } from "./Logger";
import { package_name, RPMDatabase, rpm_profile, spec_file_name } from "./RPMDatabase";
import fs = require("fs");
import uuid = require("uuid");

export abstract class Action {
    cached_prerequisites: Action[];
    pruned = false;

    protected abstract _prerequisites(): Promise<Action[]>;
    abstract execute(): Promise<void>;
    abstract toString(): string;
    abstract hash(): string;

    async prerequisites(): Promise<Action[]> {
        if (this.cached_prerequisites) return this.cached_prerequisites;
        this.cached_prerequisites = await this._prerequisites();
        return this.cached_prerequisites;
    }

    async traverse(stack: Action[] = []): Promise<Action[]> {
        Logger.debug(`Traverse: ${this}, depth = ${stack.length}`);
        for (let i = 0; i < stack.length; i++) {
            Logger.debug(`stack: ${"-".repeat(i)} ${stack[i]}`);
        }
        if (stack.length > 100) {
            throw new Error(`Stack has gone past 100. There is probably a dependency cycle.`);
        }
        const prereqs = await this.prerequisites();
        const r: Action[] = [];
        for (const a of prereqs) {
            r.push(...await a.traverse([...stack, this]));
        }
        r.push(this);
        Logger.debug(`Traverse: ${this} exiting`);
        /*for (let i = 0; i < stack.length; i++) {
            Logger.debug(`stack: ${"-".repeat(i)} ${stack[i]}`);
        }*/
        return r;
    }

    async prune() {
        await Promise.all((await this.prerequisites()).map(p => p.prune()));
        Logger.debug(`pruned: ${this}`);
        this.pruned = true;
    }
}

export class PackageInstallAction extends Action {
    what: package_name;
    where: Container;
    cached_plan: InstallPlan;

    constructor(what: package_name, where: Container) {
        super();
        this.what = what;
        this.where = where;
    }

    async ensure_plan() {
        if (!this.cached_plan) {
            this.cached_plan = await InstallPlan.pick(this.what, this.where);
        }
    }

    async _prerequisites(): Promise<Action[]> {
        await this.ensure_plan();
        return [
            ...await this.cached_plan.prerequisites(this)
        ];
    }

    async execute() {
        throw new Error("NYI");
    }

    toString(): string {
        return `install ${this.what}:${this.cached_plan} on ${this.where}`;
    }

    hash(): string {
        return `PackageInstall[${this.where}:${this.what}]`;
    }
}

export class MakeInstallableAction extends PackageInstallAction {
    async execute() {
        return;
    }

    toString(): string {
        return `install prerequisites of ${this.what}:${this.cached_plan} on ${this.where}`;
    }

    hash(): string {
        return `MakeInstallable[${this.where}:${this.what}]`;
    }
}

export class MultipleInstallAction extends Action {
    what: Set<{ name: package_name, plan: InstallPlan }> = new Set();
    where: Container;

    constructor() {
        super();
    }

    compatible(next: PackageInstallAction): boolean {
        return !this.where || next.where.uuid === this.where.uuid;
    }

    async add(next: PackageInstallAction) {
        if (!this.compatible(next)) throw new Error(`${this} and ${next} are incompatible`);
        this.where = next.where;
        await next.ensure_plan();
        this.what.add({ name: next.what, plan: next.cached_plan });
    }

    async _prerequisites(): Promise<Action[]> {
        return (await Promise.all(Array.from(this.what.values()).map(w => w.plan.prerequisites(this)))).flat();
    }

    async execute(): Promise<void> {
        Logger.info(`Running: ${this}`);
        const prepare_dedupe_key = uuid.v4();
        await Promise.all(Array.from(this.what.values()).map(w => w.plan.prepare(prepare_dedupe_key)));
        await fs.promises.mkdir(`/tmp/repo-${this.where.uuid}`, { recursive: true });
        const proc = await this.where.run_in_container(["dnf", "install", "-y", ...Array.from(this.what.values()).map(a => a.name)], { stdio: 'pipe' }, [`--volume=/tmp/repo-${this.where.uuid}:/repo`]);
        Logger.log_process_output('multiple_install', proc);
        return new Promise((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Process killed by signal ${signal}`);
                if (code) reject(`Process exited with code ${code}`);
                resolve();
            })
        })
    }

    toString(): string {
        return `install ${Array.from(this.what.values()).map(a => `${a.name}:${a.plan}`).join(", ")} on ${this.where}`;
    }

    hash(): string {
        return `MultipleInstall[${this.where}:${Array.from(this.what.values()).map(a => a.name).join("/")}]`;
    }
}

export class PackageBuildAction extends Action {
    what: spec_file_name;
    where: Container;
    target: rpm_profile;

    constructor(what: spec_file_name, where: Container, target: rpm_profile) {
        super();
        this.what = what;
        this.where = where;
        this.target = target;
    }

    async _prerequisites(): Promise<Action[]> {
        return [
            new EnsureImageAction(this.where),
            ...(await RPMDatabase.getSpecRequires(this.what, Config.get().rpm_profiles[this.target].options, 'buildrequires')).map(r => new PackageInstallAction(r, this.where))
        ];
    }

    async execute(): Promise<void> {
        if (await RPMDatabase.haveArtifacts(this.what, this.target)) {
            Logger.info(`Skipping: ${this}`);
        } else {
            Logger.info(`Running: ${this}`);
            const proc = await this.where.run_in_container(["rpmbuild", "-ba", "--verbose", ...Config.get().rpm_profiles[this.target].options, '/rpmbuild/SPECS/' + path.basename(this.what)]);
            Logger.log_process_output(`${this.what} ${this.target}`, proc);
            return new Promise((resolve, reject) => {
                proc.on('close', (code, signal) => {
                    if (signal) reject(`Process killed by signal ${signal}`);
                    if (code) reject(`Process exited with code ${code}`);
                    resolve();
                })
            });
        }
    }

    haveArtifacts(): Promise<boolean> {
        return RPMDatabase.haveArtifacts(this.what, this.target);
    }

    toString(): string {
        return `build ${this.what} in ${this.where} for ${this.target}`;
    }

    hash(): string {
        return `PackageBuild[${this.where}:${this.what}:${this.target}]`;
    }
}

export class EnsureImageAction extends Action {
    where: Container;
    build_container: Container;

    constructor(where: Container) {
        super();
        this.where = where;
    }

    protected async _prerequisites(): Promise<Action[]> {
        const image_spec: {
            script?: string,
            install_packages?: package_name[]
            installs_from?: string
        } = Config.get().build_images[this.where.image_name()];
        if (image_spec.install_packages?.length) {
            if (!this.build_container) {
                Logger.info(`Creating a new container for ${this.where} ${image_spec.installs_from}`);
                this.build_container = new Container(image_spec.installs_from);
            }
            // this sucks.
            const builds: Action[] = [];
            for(const name of image_spec.install_packages) {
                const spec = RPMDatabase.getSpecFromName(name, image_spec.installs_from);
                builds.push(new PackageBuildAction(spec.spec, this.build_container, image_spec.installs_from));
                const install = new PackageInstallAction(name, this.where);
                const tree = await install.traverse();
                for(const action of tree) {
                    if(action instanceof PackageBuildAction) {
                        builds.push(action);
                    }
                }
            }

            return builds;
        } else {
            return [];
        }
    }

    toString(): string {
        return `build image ${this.where.image_name()}`;
    }

    execute(): Promise<void> {
        Logger.info(`Running: ${this}`);
        return this.where.ensure_image();
    }

    hash(): string {
        return `EnsureImage[${this.where.image_name()}]`;
    }
}