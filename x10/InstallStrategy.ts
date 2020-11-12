import { Action, ImageBuildAction, PackageBuildAction } from "./Action";
import { BuildTarget } from "./BuildTarget";
import { Config } from "./Config";
import { BuildTargetDependency, Dependency, RPMDependency } from "./Dependency";
import { Logger } from "./Logger";
import { RPMDatabase } from "./RPMDatabase";

import * as glob from "glob";
import * as fs from "fs";
import * as util from "util";
import * as uuid from "uuid";
import path = require("path");

export abstract class InstallStrategy {
    target: BuildTarget;

    abstract can_process(dependency: Dependency): Promise<boolean>;
    abstract can_install(dependency: Dependency): Promise<boolean>;
    abstract prerequisites(dependency: Dependency, container_uuid: string): Promise<Action[]>;
    abstract install(dependency: Dependency, container_uuid: string): Promise<void>;
    abstract name(): string;

    constructor(target: BuildTarget) {
        this.target = target;
    }

    static create_from_string(str: string, target: BuildTarget): InstallStrategy {
        if (str === 'from_image_repo') {
            return new FromImageRepoStrategy(target);
        } else if (str.startsWith('from_target')) {
            return new FromTargetStrategy(
                target,
                Config.singleton.build_targets[str.split(/\s*=\s*/)[1]]
            );
        } else if (str.startsWith('build')) {
            return new LocalBuildStrategy(target);
        } else {
            return new DummyInstallStrategy(target);
        }
    }
}

export class FromImageRepoStrategy extends InstallStrategy {
    static image_repo_cache = new Map<string, boolean>();

    name() { return "FromImageRepoStrategy"; }

    async can_process(dependency: RPMDependency): Promise<boolean> {
        return true;
    }

    async can_install(dependency: RPMDependency): Promise<boolean> {
        if (FromImageRepoStrategy.image_repo_cache.has(dependency.name + ":" + this.target.runner_image)) {
            return FromImageRepoStrategy.image_repo_cache.get(dependency.name + ":" + this.target.runner_image);
        }
        Logger.info(`can_install ${dependency.name} ${this.target.runner_image}`);
        const proc = await this.target.run_in_image(["dnf", "--disablerepo=local-bootstrap", "provides", dependency.name], { stdio: 'pipe' });
        proc.stderr.on('data', (data) => {
            Logger.debug(`[${dependency.name} stderr] ${data}`);
        });
        proc.stdout.on('data', (data) => {
            Logger.debug(`[${dependency.name}] ${data}`);
        });
        return new Promise<boolean>((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Subprocess killed by signal ${signal}`);
                if (code) resolve(false);
                resolve(true);
            });
        }).then(x => {
            Logger.info(`can_install ${dependency.name} ${this.target.runner_image} returned`);
            FromImageRepoStrategy.image_repo_cache.set(dependency.name + ":" + this.target.runner_image, x);
            return x;
        });
    }

    async prerequisites(dependency: Dependency): Promise<Action[]> {
        return [];
    }

    async install(dependency: RPMDependency, container_uuid: string): Promise<void> {
        const proc = await this.target.run_in_container(container_uuid, ["dnf", "install", "-y", dependency.name], { stdio: 'pipe' });
        proc.stderr.on('data', (data) => {
            Logger.debug(`[${dependency.name} stderr] ${data}`);
        });
        proc.stdout.on('data', (data) => {
            Logger.debug(`[${dependency.name}] ${data}`);
        });
        return new Promise((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Subprocess killed by signal ${signal}`);
                if (code) reject(`Subprocess exited with code ${code}`);
                resolve();
            });
        })
    }
}

export class FromTargetStrategy extends InstallStrategy {
    from: BuildTarget;

    name() { return "FromTargetStrategy"; }

    constructor(target: BuildTarget, from: BuildTarget) {
        super(target);
        this.from = from;
    }

    async can_process(dependency: RPMDependency): Promise<boolean> {
        return true;
    }
    
    async can_install(dependency: RPMDependency): Promise<boolean> {
        const rpminfo = (await RPMDatabase.get()).lookup_rpm(this.from.name, dependency.name);
        if (rpminfo) return true;
        return false;
    }
    
    async prerequisites(dependency: RPMDependency): Promise<Action[]> {
        const rpminfo = (await RPMDatabase.get()).lookup_rpm(this.target.name, dependency.name);
        console.log(rpminfo);
        const bdepends = await RPMDatabase.get_build_dependencies(rpminfo, this.from);
        const rdepends = await RPMDatabase.get_install_dependencies(rpminfo, this.target);
        const actions = [
            ...await Dependency.resolve_dependency_list(bdepends, this.from, uuid.v4()),
            ...await Dependency.resolve_dependency_list(rdepends, this.target, uuid.v4()),
        ]

        console.log(actions);
        throw 'h';
        // 
/*            new ImageBuildAction(new BuildTargetDependency(this.from)),
            new PackageBuildAction(rpminfo)]; */
        return Action.prune(actions);
    }
    
    // awful cut & paste ahoy
    async install(dependency: RPMDependency, container_uuid: string): Promise<void> {
        Logger.info(`Installing ${dependency.toString()} dist ${this.target.name} uuid ${container_uuid}`);
        await fs.promises.mkdir(`/tmp/repo-${container_uuid}`);
        const files = await util.promisify(glob)(`../rpmbuild/RPMS/**/*.${this.target.name}.*.rpm`);
        await Promise.all(files.map(f => fs.promises.copyFile(f, path.join(`/tmp/repo-${container_uuid}`, path.basename(f)))))

        Logger.info(`Rebuilding repo for ${container_uuid}`);
        const proc_createrepo = await this.target.run_in_container(container_uuid, ["createrepo_c", "/repo"], { stdio: 'pipe' },  [`--volume=/tmp/repo-${container_uuid}:/repo`]);
        proc_createrepo.stderr.on('data', (data) => {
            Logger.debug(`[${dependency.name} stderr] ${data}`);
        });
        proc_createrepo.stdout.on('data', (data) => {
            Logger.debug(`[${dependency.name}] ${data}`);
        });
        await new Promise((resolve, reject) => {
            proc_createrepo.on('close', (code, signal) => {
                if (signal) reject(`Subprocess killed by signal ${signal}`);
                if (code) reject(`Subprocess exited with code ${code}`);
                resolve();
            });
        });

        Logger.info(`Installing package`);
        const proc = await this.target.run_in_container(container_uuid, ["dnf", "install", "-y", dependency.name], { stdio: 'pipe' }, [`--volume=/tmp/repo-${container_uuid}:/repo`]);
        proc.stderr.on('data', (data) => {
            Logger.debug(`[${dependency.name} stderr] ${data}`);
        });
        proc.stdout.on('data', (data) => {
            Logger.debug(`[${dependency.name}] ${data}`);
        });
        await new Promise((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Subprocess killed by signal ${signal}`);
                if (code) reject(`Subprocess exited with code ${code}`);
                resolve();
            });
        })

        Logger.info(`Cleaning /tmp/repo-${container_uuid}`);
        await fs.promises.rmdir(`/tmp/repo-${container_uuid}`, {recursive: true});
    }
}

export class LocalBuildStrategy extends InstallStrategy {
    name() { return "LocalBuildStrategy"; }

    async can_process(dependency: RPMDependency): Promise<boolean> {
        return true;
    }

    async can_install(dependency: RPMDependency): Promise<boolean> {
        const rpminfo = (await RPMDatabase.get()).lookup_rpm(this.target.name, dependency.name);
        if (rpminfo) return true;
        return false;
    }

    async prerequisites(dependency: RPMDependency, container_uuid: string): Promise<Action[]> {
        const rpminfo = (await RPMDatabase.get()).lookup_rpm(this.target.name, dependency.name);
        const actions = [
            new ImageBuildAction(new BuildTargetDependency(this.target)),
            new PackageBuildAction(rpminfo)];
        return Action.prune(actions);
    }

    async install(dependency: RPMDependency, container_uuid: string): Promise<void> {
        Logger.info(`Installing ${dependency.toString()} dist ${this.target.name} uuid ${container_uuid}`);
        await fs.promises.mkdir(`/tmp/repo-${container_uuid}`);
        const files = await util.promisify(glob)(`../rpmbuild/RPMS/**/*.${this.target.name}.*.rpm`);
        await Promise.all(files.map(f => fs.promises.copyFile(f, path.join(`/tmp/repo-${container_uuid}`, path.basename(f)))))

        Logger.info(`Rebuilding repo for ${container_uuid}`);
        const proc_createrepo = await this.target.run_in_container(container_uuid, ["createrepo_c", "/repo"], { stdio: 'pipe' },  [`--volume=/tmp/repo-${container_uuid}:/repo`]);
        proc_createrepo.stderr.on('data', (data) => {
            Logger.debug(`[${dependency.name} stderr] ${data}`);
        });
        proc_createrepo.stdout.on('data', (data) => {
            Logger.debug(`[${dependency.name}] ${data}`);
        });
        await new Promise((resolve, reject) => {
            proc_createrepo.on('close', (code, signal) => {
                if (signal) reject(`Subprocess killed by signal ${signal}`);
                if (code) reject(`Subprocess exited with code ${code}`);
                resolve();
            });
        });

        Logger.info(`Installing package`);
        const proc = await this.target.run_in_container(container_uuid, ["dnf", "install", "-y", dependency.name], { stdio: 'pipe' }, [`--volume=/tmp/repo-${container_uuid}:/repo`]);
        proc.stderr.on('data', (data) => {
            Logger.debug(`[${dependency.name} stderr] ${data}`);
        });
        proc.stdout.on('data', (data) => {
            Logger.debug(`[${dependency.name}] ${data}`);
        });
        await new Promise((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Subprocess killed by signal ${signal}`);
                if (code) reject(`Subprocess exited with code ${code}`);
                resolve();
            });
        })

        Logger.info(`Cleaning /tmp/repo-${container_uuid}`);
        await fs.promises.rmdir(`/tmp/repo-${container_uuid}`, {recursive: true});
    }
}

export class DummyInstallStrategy extends InstallStrategy {
    name() { return "DummyInstallStrategy"; }

    prerequisites(dependency: Dependency): Promise<Action[]> {
        throw new Error("Method not implemented.");
    }
    async can_process(dependency: RPMDependency): Promise<boolean> {
        return false;
    }
    can_install(dependency: RPMDependency): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    install(dependency: RPMDependency): Promise<void> {
        throw new Error("Method not implemented.");
    }

}