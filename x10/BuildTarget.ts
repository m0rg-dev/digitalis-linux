import { Mutex } from "async-mutex";
import * as child_process from "child_process";
import { Dependency } from "./Dependency";
import { InstallStrategy } from "./InstallStrategy";
import * as fs from "fs";
import { Logger } from "./Logger";
import { RPMDependency } from "./RPMDatabase";

export class BuildTarget {
    runner_image: string;
    install_strategies: InstallStrategy[];
    additional_podman_args: string[];
    name: string;

    command_mutex: Mutex;

    constructor(object: any, name: string);
    constructor(runner_image: string, install_strategy: string[], additional_podman_args: string[], name: string);
    constructor(arg1: any, arg2: string[] | string, additional_podman_args?: string[], name?: string) {
        let install_strategy_strings: string[];
        if (typeof arg1 === 'string' && typeof arg2 === 'object') {
            this.runner_image = arg1;
            install_strategy_strings = arg2;
            this.additional_podman_args = additional_podman_args;
            this.name = name;
        } else if (typeof arg2 === 'string') {
            this.runner_image = arg1.runner_image;
            install_strategy_strings = arg1.install_strategy;
            this.additional_podman_args = arg1.additional_podman_args || [];
            this.name = arg2;
        } else {
            throw new Error("BuildTarget constructor called with incompatible arguments");
        }

        this.install_strategies = install_strategy_strings.map((s) => InstallStrategy.create_from_string(s, this));
        this.command_mutex = new Mutex();
    }

    async podman_arguments(): Promise<string[]> {
        return [
            '--net', 'host',
            '--volume', (await fs.promises.realpath("../rpmbuild")) + ':/rpmbuild'
        ].concat(this.additional_podman_args);
    }

    async run_in_image(command: string[], options?: child_process.SpawnOptions): Promise<child_process.ChildProcess> {
        const args = ['run', '--rm', '-it'].concat(await this.podman_arguments()).concat([this.runner_image]).concat(command);
        // console.log(['podman', ...args]);
        const release = await this.command_mutex.acquire();
        const process = child_process.spawn('podman', args, options);
        process.on('exit', () => release());
        return process;
    }

    async ensure_container(container_uuid: string): Promise<void> {
        const proc = child_process.spawn('buildah', ['inspect', '-t', 'container', container_uuid]);
        return new Promise(async (resolve, reject) => {
            proc.on('exit', (code, signal) => {
                if (signal) reject(`Process killed by signal ${signal}`);
                if (code == 125) resolve(false);
                if (code) reject(`Process exited with code ${code}`);
                resolve(true);
            })
        }).then((container_exists) => {
            if (!container_exists) {
                Logger.info(`Creating container ${container_uuid} from ${this.runner_image}`);
                const proc2 = child_process.spawn('buildah', ['from', '--name', container_uuid, this.runner_image]);
                return new Promise((resolve, reject) => {
                    proc2.on('exit', (code, signal) => {
                        if (signal) reject(`Process killed by signal ${signal}`);
                        if (code) reject(`Process exited with code ${code}`);
                        resolve();
                    })
                });
            }
            return Promise.resolve();
        });
    }

    async run_in_container(container_uuid: string, command: string[], options?: child_process.SpawnOptions, more_args: string[] = []): Promise<child_process.ChildProcess> {
        await this.ensure_container(container_uuid);
        const args = ['run', ...await this.podman_arguments(), ...more_args, container_uuid, ...command];
        const release = await this.command_mutex.acquire();
        const process = child_process.spawn('buildah', args, options);
        process.on('exit', () => release());
        return process;
    }

    async can_install(dependency: RPMDependency): Promise<InstallStrategy | null> {
        return new Promise(async (resolve, reject) => {
            for (const strategy of this.install_strategies) {
                if (await strategy.can_process(dependency)) {
                    if (await strategy.can_install(dependency)) resolve(strategy);
                }
            }
            resolve(undefined);
        });
    }
}
