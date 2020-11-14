import { Action, MakeInstallableAction, PackageBuildAction, PackageInstallAction } from "./Action";
import { Config } from "./Config";
import { Container } from "./Container";
import { Logger } from "./Logger";
import { dist_name, package_name, RPMDatabase, spec_with_options } from "./RPMDatabase";
import { Speculation } from "./Speculation";
import fs = require('fs');
import util = require('util');
import glob = require('glob');
import path = require("path");
import { Mutex } from "async-mutex";

export abstract class InstallPlan {
    what: package_name;
    where: Container;

    abstract can_install(): Promise<boolean>;
    abstract prerequisites(parent: Action, _recur?: any): Promise<Action[]>;
    abstract prepare(key: string): Promise<void>;
    abstract toString(): string;

    protected constructor(what: package_name, where: Container) {
        this.what = what;
        this.where = where;
    }

    static async pick(what: package_name, where: Container): Promise<InstallPlan> {
        const strings: string[] = Config.get().rpm_profiles[where.profile].installs_from;
        for (const string of strings) {
            var candidate: InstallPlan;
            if (string === 'image') {
                candidate = new ImageInstallPlan(what, where);
            } else if (string.startsWith('local_repo')) {
                const repo = string.split(/\s*=\s*/)[1];
                candidate = new LocalRepoInstallPlan(what, where, repo);
            } else {
                throw new Error(`Unknown install type ${string}`);
            }

            if (await candidate.can_install()) {
                return candidate;
            }
        }
        throw new Error(`Couldn't find an install plan for ${what} on ${where}!`);
    }
}

export class ImageInstallPlan extends InstallPlan {
    private static installability_cache = new Map<string, boolean>();

    static async read_cache() {
        try {
            const json = JSON.parse(fs.readFileSync('install.cache').toString());
            for (const key in json) {
                ImageInstallPlan.installability_cache.set(key, json[key]);
            }
        } catch (e) {
            Logger.warn(`Couldn't read installability cache: ${e}`);
        }
    }

    static async write_cache() {
        const json = {};
        ImageInstallPlan.installability_cache.forEach((value, key) => {
            json[key] = value;
        });
        fs.writeFileSync("install.cache", JSON.stringify(json, undefined, 1));
    }

    async can_install(): Promise<boolean> {
        Logger.debug(`Checking installability: ImageInstall ${this.what} ${this.where}`);
        await ImageInstallPlan.read_cache();
        const cache_key = `${this.what} ${this.where.image_name()}`;
        if (!ImageInstallPlan.installability_cache.has(cache_key)) {
            const release = await this.where.acquire_image_lock();
            if (!ImageInstallPlan.installability_cache.has(cache_key)) {
                Logger.info(`installability cache miss ${cache_key}`);
                const proc = await this.where.run_in_image(["dnf", "--disablerepo=local-bootstrap", "provides", this.what], { stdio: 'pipe' }, false);
                proc.stderr.on('data', (data) => {
                    Logger.debug(`[${this.what} stderr] ${data}`);
                });
                proc.stdout.on('data', (data) => {
                    Logger.debug(`[${this.what}] ${data}`);
                });
                const res = await new Promise<boolean>((resolve, reject) => {
                    proc.on('close', (code, signal) => {
                        release();
                        if (signal) reject(`Subprocess killed by signal ${signal}`);
                        if (code) resolve(false);
                        resolve(true);
                    });
                });
                Logger.info(`Setting: ${cache_key} ${res}`);
                ImageInstallPlan.installability_cache.set(cache_key, res);
                ImageInstallPlan.write_cache();
                return res;
            } else {
                Logger.info(`(resolved after miss ${cache_key})`);
                release();
                return ImageInstallPlan.installability_cache.get(cache_key);
            }
        } else {
            return ImageInstallPlan.installability_cache.get(cache_key);
        }
    }

    async prerequisites(): Promise<Action[]> {
        return [];
    }

    async prepare() {

    }

    toString(): string {
        return `[${this.where.image_name()}]`;
    }
}

export class LocalRepoInstallPlan extends InstallPlan {
    whence: dist_name;
    cached_requires: string[];
    sub_container: Container;

    constructor(what: package_name, where: Container, whence: dist_name) {
        super(what, where);
        this.whence = whence;
    }


    private async ensure_requires() {
        this.cached_requires = await RPMDatabase.getPackageRequires(this.what, this.whence);
    }

    private static installabilityCache = new Map<string, boolean>();

    async can_install(): Promise<boolean> {
        const cache_key = `${this.what}:${this.whence}`;
        if (LocalRepoInstallPlan.installabilityCache.has(cache_key)) {
            return LocalRepoInstallPlan.installabilityCache.get(cache_key);
        } else {
            Logger.debug(`Checking installability: LocalRepoInstall ${this.what} ${this.where} ${this.whence}`);
            try {
                await this.ensure_requires();
                LocalRepoInstallPlan.installabilityCache.set(cache_key, true);
                return true;
            } catch (e) {
                Logger.info(`Failed because ${e}`);
                LocalRepoInstallPlan.installabilityCache.set(cache_key, false);
                return false;
            }
        }
    }

    async prerequisites(parent: Action, _recur?: Set<package_name>): Promise<Action[]> {
        await this.ensure_requires();
        const spec = RPMDatabase.getSpecFromName(this.what, this.whence);
        const ret: Action[] = [];
        if (!Speculation.isPending(spec)) {
            if (!this.sub_container) {
                Logger.info(`Creating a new container for ${this.what} ${this.where} ${this.whence}`);
                this.sub_container = new Container(this.whence);
            }
            ret.push(new PackageBuildAction(spec.spec, this.sub_container, spec.profile));
            Speculation.dispatch(spec);
        }
        ret.push(...this.cached_requires.map(req => new PackageInstallAction(req, this.where)));
        return ret;
    }

    private static done = new Set<string>();
    private static dont_squish_the_repo_mutex = new Mutex();

    async prepare(key: string): Promise<void> {
        const release = await LocalRepoInstallPlan.dont_squish_the_repo_mutex.acquire();
        if (!key || !LocalRepoInstallPlan.done.has(key + this.whence)) {
            await fs.promises.mkdir(`/tmp/repo-${this.where.uuid}`, { recursive: true });
            const files = await util.promisify(glob)(`../rpmbuild/RPMS/**/*.${this.whence}.*.rpm`);
            await Promise.all(files.map(f => fs.promises.copyFile(f, path.join(`/tmp/repo-${this.where.uuid}`, path.basename(f)))))

            Logger.info(`Rebuilding repo for ${this.where.uuid} ${this.whence}`);
            const proc = await this.where.run_in_container(["createrepo_c", "/repo"], { stdio: 'pipe' }, [`--volume=/tmp/repo-${this.where.uuid}:/repo`]);
            Logger.log_process_output(`${this.what} repo`, proc);
            await new Promise((resolve, reject) => {
                proc.on('close', (code, signal) => {
                    if (signal) reject(`Subprocess killed by signal ${signal}`);
                    if (code) reject(`Subprocess exited with code ${code}`);
                    resolve();
                });
            });
            const proc2 = await this.where.run_in_container(["dnf", "makecache", "--repo=local-bootstrap"], { stdio: 'pipe' }, [`--volume=/tmp/repo-${this.where.uuid}:/repo`]);
            Logger.log_process_output(`${this.what} cache`, proc2);
            await new Promise((resolve, reject) => {
                proc2.on('close', (code, signal) => {
                    if (signal) reject(`Subprocess killed by signal ${signal}`);
                    if (code) reject(`Subprocess exited with code ${code}`);
                    resolve();
                });
            });
            LocalRepoInstallPlan.done.add(key + this.whence);
        }
        release();
    }

    toString() {
        return `${this.whence}`;
    }
}