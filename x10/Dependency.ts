import { Action, ImageBuildAction, PackageInstallAction } from "./Action";
import { BuildTarget } from "./BuildTarget";
import { Logger } from "./Logger";

export abstract class Dependency {
    abstract toString(): string;

    static async resolve_dependency_list(dependencies: Dependency[], build_target: BuildTarget, container_uuid: string): Promise<Action[]> {
        Logger.info(`Resolving a dependency list for ${container_uuid} ${build_target.name}`);
        let promises: Promise<Action>[] = [];
        for (const dependency of dependencies) {
            promises.push(new Promise(async (resolve, reject) => {
                if (dependency instanceof BuildTargetDependency) {
                    resolve(new ImageBuildAction(dependency));
                } else if (dependency instanceof RPMDependency) {
                    const strategy = await build_target.can_install(dependency);
                    if (strategy) {
                        resolve(new PackageInstallAction(dependency, strategy, container_uuid));
                    } else {
                        throw new Error(`No way to install ${dependency.name}!`);
                    }
                }
            }));
        }
        return Promise.all(promises);
    }
}

export class RPMDependency extends Dependency {
    name: string;
    spec?: string;

    constructor(name: string, spec?: string) {
        super();
        this.name = name;
        this.spec = spec;
    }

    toString() {
        return `RPMDependency: ${this.name}`;
    }
}

export class BuildTargetDependency extends Dependency {
    target: BuildTarget;

    constructor(target: BuildTarget) {
        super();
        this.target = target;
    }

    toString() {
        return `BuildTargetDependency: ${this.target.runner_image}`;
    }
}