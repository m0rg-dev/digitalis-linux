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
    remote_target: string | null;

    private static command_mutices = new Map<string, Mutex>();
    private static ensured_containers = new Set<string>();
    private static ensured_images = new Set<string>();

    constructor(image: image_name, remote_target?: string) {
        this.image = image;
        this.uuid = uuid.v4();
        this.remote_target = remote_target;
    }

    private async ensure() {
        if (Container.ensured_containers.has(this.uuid)) return;
        await this.ensure_image(this.remote_target);
        const proc = this.spawn('buildah', ['inspect', '-t', 'container', this.uuid]);
        return new Promise(async (resolve, reject) => {
            proc.on('exit', (code, signal) => {
                if (signal) reject(`Process killed by signal ${signal}`);
                if (code == 125) resolve(false);
                if (code) reject(`Process exited with code ${code}`);
                resolve(true);
            })
        }).then((container_exists) => {
            if (!container_exists) {
                Logger.debug(`Creating container ${this.uuid} from ${this.image}`);
                const proc2 = this.spawn('buildah', ['from', '--name', this.uuid, this.image]);
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

    async imagePresent(): Promise<boolean> {
        const proc = child_process.spawn('podman', ['image', 'exists', this.image]);
        return (!Config.ignoredExistingImages.has(this.image))
            && await new Promise((resolve, reject) => {
                proc.on('close', (code, signal) => {
                    if (signal) reject(`Process killed by signal ${signal}`);
                    if (code > 1) reject(`Process exited with code ${code}`);
                    if (code == 1) resolve(false);
                    Container.ensured_images.add(this.image);
                    resolve(true);
                })
            });
    }

    private spawn(proc: string, args: string[], options?: child_process.SpawnOptions) {
        if(this.remote_target) {
            return child_process.spawn('ssh', [this.remote_target, proc, ...args.map(x => `'${x.replace(/'/g, "\\'")}'`)], options);
        } else {
            return child_process.spawn(proc, args, options);
        }
    }

    async ensure_image(target?: string | null) {
        if (target) {
            this.ensure_image(undefined);
            Logger.debug(`Checking for ${this.image} on ${target}`);
            const image_spec = Config.get().build_images[this.image];
            if (image_spec.dirs) {
                for (const dir of image_spec.dirs) {
                    // TODO this is bad
                    Logger.debug(`creating ${dir} on ${target}`);
                    child_process.spawnSync('ssh', [target, 'mkdir', '-p', dir]);
                }
            }
            const get_local_id = child_process.spawnSync('podman', ['image', 'inspect', `${this.image}:latest`]);
            const local_imgs = JSON.parse(get_local_id.output.join("\n"));
            const get_remote_id = child_process.spawnSync('ssh', [target, 'podman', 'image', 'inspect', `localhost/${this.image}:latest`]);
            const remote_imgs = JSON.parse(get_remote_id.output.join("\n"));
            if (get_remote_id.status
                || local_imgs[0].Id != remote_imgs[0].Id) {
                Logger.debug(`Copying ${this.image} to ${target}`);
                const copy = child_process.spawn('sh',
                    ['-c', `podman image save "${this.image}" | ssh "${target}" podman image load`],
                    { stdio: 'pipe' }
                );
                Logger.logProcessOutput(`copy ${this.image} to ${target}`, copy);
                await new Promise((resolve, reject) => {
                    copy.on('close', (code, signal) => {
                        if (signal) reject(`Process killed by signal ${signal}`);
                        if (code) reject(`Process exited with code ${code}`);
                        resolve();
                    });
                });
            }
        } else {
            const image_spec = Config.get().build_images[this.image];
            if (image_spec.dirs) {
                for (const dir of image_spec.dirs) {
                    if (fs.existsSync(dir)) continue;
                    Logger.debug(`creating ${dir}`);
                    fs.mkdirSync(dir);
                }
            }
            if (Container.ensured_images.has(this.image)) return;
            Logger.debug(`ensuring ${this.image}`);
            const present = await this.imagePresent();
            if (!present) {
                // We always want to run this one locally.
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
    }

    async destroy() {
        if (!Container.ensured_containers.has(this.uuid)) return;
        Logger.debug(`Destroying container ${this} on ${this.remote_target}`);
        const proc = this.spawn('buildah', ['rm', this.uuid], { stdio: 'pipe' });
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
            //'--volume', (await fs.promises.realpath("../rpmbuild")) + ':/rpmbuild'
        ].concat(Config.get().build_images[this.image].additional_podman_args || []);
    }

    async acquire_image_lock(force_local?: boolean): Promise<MutexInterface.Releaser> {
        const target = (!force_local && this.remote_target) || 'local';
        if(!Container.command_mutices.has(target)) Container.command_mutices.set(target, new Mutex());
        return Container.command_mutices.get(target).acquire();
    }

    async run_in_image(command: string[], options?: child_process.SpawnOptions, lock = true, more_args: string[] = []): Promise<child_process.ChildProcess> {
        await this.ensure_image(this.remote_target);
        const args = ['run', '--rm', '-it', ...await this.podman_arguments(), ...more_args, this.image, ...command];
        let release: MutexInterface.Releaser;
        if (lock) {
            release = await this.acquire_image_lock(true);
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
        Logger.debug(`[${this.remote_target || 'local'}] buildah ${args.map(a => `"${a}"`).join(" ")}`);
        const release = await this.acquire_image_lock();
        const process = this.spawn('buildah', args, options);
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