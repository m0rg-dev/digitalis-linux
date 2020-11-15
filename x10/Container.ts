import * as child_process from 'child_process';
import * as uuid from 'uuid';
import * as fs from 'fs';
import { Config } from './Config';
import { Logger } from './Logger';
import { rpm_profile } from './RPMDatabase';
import { Mutex, MutexInterface } from 'async-mutex';

export type image_name = string;

export class Container {
    image: image_name;
    uuid: string;

    private static command_mutex = new Mutex();
    private static ensured_containers = new Set<string>();
    private static ensured_images = new Set<string>();

    constructor(image: image_name) {
        this.image = image;
        this.uuid = uuid.v4();
    }

    private async ensure() {
        if (Container.ensured_containers.has(this.uuid)) return;
        await this.ensure_image();
        const proc = child_process.spawn('buildah', ['inspect', '-t', 'container', this.uuid]);
        return new Promise(async (resolve, reject) => {
            proc.on('exit', (code, signal) => {
                if (signal) reject(`Process killed by signal ${signal}`);
                if (code == 125) resolve(false);
                if (code) reject(`Process exited with code ${code}`);
                resolve(true);
            })
        }).then((container_exists) => {
            if (!container_exists) {
                Logger.info(`Creating container ${this.uuid} from ${this.image}`);
                const proc2 = child_process.spawn('buildah', ['from', '--name', this.uuid, this.image]);
                return new Promise((resolve, reject) => {
                    proc2.on('exit', (code, signal) => {
                        if (signal) reject(`Process killed by signal ${signal}`);
                        if (code) reject(`Process exited with code ${code}`);
                        resolve();
                    })
                });
            }
            Container.ensured_containers.add(this.uuid);
            return Promise.resolve();
        });
    }

    async ensure_image() {
        if (Container.ensured_images.has(this.image)) return;
        Logger.debug(`ensuring ${this.image}`);
        const proc = child_process.spawn('podman', ['image', 'exists', this.image]);
        const image_spec = Config.get().build_images[this.image];
        if (image_spec.dirs) {
            for (const dir of image_spec.dirs) {
                if (fs.existsSync(dir)) continue;
                Logger.debug(`creating ${dir}`);
                fs.mkdirSync(dir);
            }
        }
        const present = await new Promise((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Process killed by signal ${signal}`);
                if (code > 1) reject(`Process exited with code ${code}`);
                if (code == 1) resolve(false);
                Container.ensured_images.add(this.image);
                resolve(true);
            })
        });
        if (!present) {
            if (image_spec.script) {
                const proc2 = child_process.spawn('sh', ['-exc', image_spec.script], { stdio: 'pipe' });
                proc2.stderr.on('data', (data) => {
                    Logger.debug(`[${this.image} stderr] ${data}`);
                });
                proc2.stdout.on('data', (data) => {
                    Logger.debug(`[${this.image}] ${data}`);
                });
                await new Promise((resolve, reject) => {
                    proc2.on('close', (code, signal) => {
                        if (signal) reject(`Process killed by signal ${signal}`);
                        if (code) reject(`Process exited with code ${code}`);
                        Container.ensured_images.add(this.image);
                        resolve();
                    })
                });
            } else {
                throw new Error('nyi lmao');
            }
        }
    }

    async destroy() {
        if (!Container.ensured_containers.has(this.uuid)) return;
        Logger.debug(`Destroying container ${this}`);
        const proc = child_process.spawn('buildah', ['rm', this.uuid], { stdio: 'pipe' });
        Logger.logProcessOutput(`destroy ${this}`, proc);
        await new Promise((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Process killed by signal ${signal}`);
                if (code) reject(`Process exited with code ${code}`);
                Container.ensured_containers.delete(this.uuid);
                resolve();
            })
        });
    }

    async podman_arguments(): Promise<string[]> {
        return [
            '--net', 'host',
            '--volume', (await fs.promises.realpath("../rpmbuild")) + ':/rpmbuild'
        ].concat(Config.get().build_images[this.image].additional_podman_args || []);
    }

    async acquire_image_lock(): Promise<MutexInterface.Releaser> {
        return await Container.command_mutex.acquire();
    }

    async run_in_image(command: string[], options?: child_process.SpawnOptions, lock = true): Promise<child_process.ChildProcess> {
        await this.ensure_image();
        const args = ['run', '--rm', '-it'].concat(await this.podman_arguments()).concat([this.image]).concat(command);
        let release: MutexInterface.Releaser;
        if (lock) {
            release = await this.acquire_image_lock();
        }
        const process = child_process.spawn('podman', args, options);
        if (lock) {
            process.on('exit', () => release());
        }
        return process;
    }

    async run_in_container(command: string[], options?: child_process.SpawnOptions, more_args: string[] = []): Promise<child_process.ChildProcess> {
        await this.ensure();
        const args = ['run', ...await this.podman_arguments(), ...more_args, this.uuid, ...command];
        Logger.debug(`buildah ${args.map(a => `"${a}"`).join(" ")}`);
        const release = await Container.command_mutex.acquire();
        const process = child_process.spawn('buildah', args, options);
        process.on('exit', () => release());
        return process;
    }

    toString(): string {
        return `[${this.image} ${this.uuid}]`;
    }
}

/** @deprecated */
export class old_Container extends Container {
    constructor(profile: rpm_profile) {
        super(Config.get().rpm_profiles[profile].image)
    }
    image_name() { return this.image }
}