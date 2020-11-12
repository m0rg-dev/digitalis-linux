import { Action } from "./Action";
import { BuildTarget } from "./BuildTarget";
import { Config } from "./Config";
import { Logger } from "./Logger";
import { RPMDatabase, RPMDependency } from "./RPMDatabase";

import path = require("path");

export abstract class InstallStrategy {
    target: BuildTarget;

    abstract can_process(dependency: RPMDependency): Promise<boolean>;
    abstract can_install(dependency: RPMDependency): Promise<boolean>;
    abstract prerequisites(dependency: RPMDependency): Promise<Action[]>;
    abstract install(dependency: RPMDependency, container_uuid: string): Promise<void>;
    abstract name(): string;

    constructor(target: BuildTarget) {
        this.target = target;
    }

    static create_from_string(str: string, target: BuildTarget): InstallStrategy {
        if (str === 'from_image_repo') {
            return new FromImageRepoStrategy(target);
        } else if (str.startsWith('from_target')) {
            return new CrossStrategy(
                target,
                Config.singleton.build_targets[str.split(/\s*=\s*/)[1]]
            );
        } else if (str.startsWith('build')) {
            return new CrossStrategy(target, target);
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

    async prerequisites(dependency: RPMDependency): Promise<Action[]> {
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

export class CrossStrategy extends InstallStrategy {
    install(dependency: RPMDependency, container_uuid: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
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
        throw 'h';
        // 
/*            new ImageBuildAction(new BuildTargetDependency(this.from)),
            new PackageBuildAction(rpminfo)]; 
        return Action.prune(actions);*/
    }
    
    // awful cut & paste ahoy
    // async install(dependency: RPMDependency, container_uuid: string): Promise<void> {
    //     Logger.info(`Installing ${dependency.toString()} dist ${this.target.name} uuid ${container_uuid}`);
    //     await fs.promises.mkdir(`/tmp/repo-${container_uuid}`);
    //     const files = await util.promisify(glob)(`../rpmbuild/RPMS/**/*.${this.target.name}.*.rpm`);
    //     await Promise.all(files.map(f => fs.promises.copyFile(f, path.join(`/tmp/repo-${container_uuid}`, path.basename(f)))))

    //     Logger.info(`Rebuilding repo for ${container_uuid}`);
    //     const proc_createrepo = await this.target.run_in_container(container_uuid, ["createrepo_c", "/repo"], { stdio: 'pipe' },  [`--volume=/tmp/repo-${container_uuid}:/repo`]);
    //     proc_createrepo.stderr.on('data', (data) => {
    //         Logger.debug(`[${dependency.name} stderr] ${data}`);
    //     });
    //     proc_createrepo.stdout.on('data', (data) => {
    //         Logger.debug(`[${dependency.name}] ${data}`);
    //     });
    //     await new Promise((resolve, reject) => {
    //         proc_createrepo.on('close', (code, signal) => {
    //             if (signal) reject(`Subprocess killed by signal ${signal}`);
    //             if (code) reject(`Subprocess exited with code ${code}`);
    //             resolve();
    //         });
    //     });

    //     Logger.info(`Installing package`);
    //     const proc = await this.target.run_in_container(container_uuid, ["dnf", "install", "-y", dependency.name], { stdio: 'pipe' }, [`--volume=/tmp/repo-${container_uuid}:/repo`]);
    //     proc.stderr.on('data', (data) => {
    //         Logger.debug(`[${dependency.name} stderr] ${data}`);
    //     });
    //     proc.stdout.on('data', (data) => {
    //         Logger.debug(`[${dependency.name}] ${data}`);
    //     });
    //     await new Promise((resolve, reject) => {
    //         proc.on('close', (code, signal) => {
    //             if (signal) reject(`Subprocess killed by signal ${signal}`);
    //             if (code) reject(`Subprocess exited with code ${code}`);
    //             resolve();
    //         });
    //     })

    //     Logger.info(`Cleaning /tmp/repo-${container_uuid}`);
    //     await fs.promises.rmdir(`/tmp/repo-${container_uuid}`, {recursive: true});
    // }
}

export class DummyInstallStrategy extends InstallStrategy {
    name() { return "DummyInstallStrategy"; }

    prerequisites(dependency: RPMDependency): Promise<Action[]> {
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