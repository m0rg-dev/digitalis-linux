import { Config } from "./Config";
import { Container, image_name } from "./Container";
import { Logger } from "./Logger";
import { dist_name, PackageNotFoundError, package_name, RPMDatabase, spec_with_options } from "./RPMDatabase";
import fs = require('fs');
import util = require('util');
import glob = require('glob');
import path = require('path');

export class PackageUnresolvableError extends Error {

}

export abstract class Package {
    name: package_name;
    installed_on: image_name;
    abstract installDependencies(working_set?: Set<string>): Promise<Set<Package>>;
    abstract buildDependencies(working_set?: Set<string>): Promise<Set<Package>>;
    abstract hash(): string;
    abstract _prettyPrint(): string;

    abstract can_install(): Promise<boolean>;

    protected constructor(name: package_name, installed_on: image_name) {
        this.name = name;
        this.installed_on = installed_on;
    }

    static async resolve(name: package_name, installed_on: image_name): Promise<Package> {
        for (const candidate of [
            new AxiomPackage(name, installed_on),
            new BuiltPackage(name, installed_on)
        ]) {
            if (await candidate.can_install()) {
                return candidate;
            }
        }
        throw new PackageUnresolvableError(`Can't find a way to install ${name} on ${installed_on}!`);
    }

    async prettyPrint(depth = 0): Promise<string> {
        const lines: string[] = [];
        lines.push(this._prettyPrint());
        for (const bdep of (await this.buildDependencies())) {
            lines.push(" \x1b[31m" + bdep._prettyPrint() + "\x1b[0m");
        }
        for (const idep of (await this.installDependencies())) {
            lines.push(" \x1b[32m" + idep._prettyPrint() + "\x1b[0m");
        }
        return lines.map(x => (" ".repeat(depth) + x)).join("\n");
    }
}

export class BuiltPackage extends Package {
    spec: spec_with_options;
    unusable = false;

    hash(): string {
        return `BuiltPackage[${this.spec.spec},${this.spec.profile},${this.name},${this.installed_on}]`;
    }

    _prettyPrint(): string {
        const build_image = Config.get().rpm_profiles[this.spec.profile].image;
        return `Build: ${this.spec.spec}:${this.spec.profile} in ${build_image} for ${this.installed_on} (actual target ${this.name})`;
    }

    constructor(name: package_name, installed_on: image_name) {
        super(name, installed_on);
        try {
            this.spec = RPMDatabase.getSpecFromName(this.name, Config.get().build_images[this.installed_on].profile);
        } catch (e) {
            this.unusable = true;
        }
    }

    async installDependencies(working_set: Set<string> = new Set()): Promise<Set<Package>> {
        working_set.add(this.hash());
        const profile = this.spec.profile;
        const reqs = await RPMDatabase.getPackageRequires(this.name, profile);
        const breqs = await RPMDatabase.getSpecRequires(this.spec.spec, Config.get().rpm_profiles[profile].native_options, 'buildrequires');
        const req_packages = await Promise.all(reqs.map(req => Package.resolve(req, this.installed_on)));
        const breq_req_packages = (await Promise.all(breqs.map(breq => Package.resolve(breq, this.installed_on)
            .then(p => (working_set.has(p.hash())) ? new Set<Package>() : p.installDependencies(working_set)))))
            .map(x => Array.from(x)).flat();
        const set_with_dupes = new Set([...req_packages, ...breq_req_packages]);
        const return_set = new Map<string, Package>();
        set_with_dupes.forEach(p => return_set.set(p.hash(), p));
        return new Set(return_set.values());
    }

    async buildDependencies(): Promise<Set<Package>> {
        const profile = this.spec.profile;
        const build_image = Config.get().rpm_profiles[this.spec.profile].image;
        const breqs = await RPMDatabase.getSpecRequires(this.spec.spec, Config.get().rpm_profiles[profile].options, 'buildrequires');
        const breq_packages = await Promise.all(breqs.map(breq => Package.resolve(breq, build_image)));
        return new Set(breq_packages);
    }

    async can_install(): Promise<boolean> {
        if (this.unusable) return false;

        try {
            await RPMDatabase.getPackageRequires(this.name, Config.get().build_images[this.installed_on].profile);
            return true;
        } catch (e) {
            if (e instanceof PackageNotFoundError) {
                return false;
            } else {
                throw e;
            }
        }
    }

    async run() {
        if (await RPMDatabase.haveArtifacts(this.spec.spec, this.spec.profile)) {
            Logger.info(`Already have artifacts for ${this._prettyPrint()}.`)
        } else {
            Logger.info(`Running: ${this._prettyPrint()}`);
            const build_container = new Container(Config.get().rpm_profiles[this.spec.profile].image);
            await build_container.run_in_container(['true']);
            const deps = await this.buildDependencies();
            const repos = new Set<dist_name>();
            const packages = new Set<package_name>();
            deps.forEach(dep => {
                if (dep instanceof BuiltPackage) {
                    repos.add(Config.get().rpm_profiles[dep.spec.profile].dist || dep.spec.profile);
                }
                packages.add(dep.name);
            });
            if (repos.size > 1) {
                throw new Error("this should be possible but we aren't doing it");
            }
            await fs.promises.mkdir(`/tmp/repo-${build_container.uuid}`, { recursive: true });
            // Rebuild the repository, if necessary.
            if (repos.size) {
                const dist = Array.from(repos.values())[0];
                const files = await util.promisify(glob)(`../rpmbuild/RPMS/**/*.${dist}.*.rpm`);
                await Promise.all(files.map(f => fs.promises.copyFile(f, path.join(`/tmp/repo-${build_container.uuid}`, path.basename(f)))))
                Logger.info(`Rebuilding repo ${dist} for ${build_container.uuid}`);
                const proc_createrepo = await build_container.run_in_container(["createrepo_c", "/repo"], { stdio: 'pipe' }, [`--volume=/tmp/repo-${build_container.uuid}:/repo`]);
                Logger.logProcessOutput(`${dist} repo`, proc_createrepo);
                await new Promise((resolve, reject) => {
                    proc_createrepo.on('close', (code, signal) => {
                        if (signal) reject(`Subprocess killed by signal ${signal}`);
                        if (code) reject(`Subprocess exited with code ${code}`);
                        resolve();
                    });
                });
                const proc_makecache = await build_container.run_in_container(["dnf", "makecache", "--repo", Config.get().build_images[build_container.image].repository], { stdio: 'pipe' }, [`--volume=/tmp/repo-${build_container.uuid}:/repo`]);
                Logger.logProcessOutput(`${dist} cache`, proc_makecache);
                await new Promise((resolve, reject) => {
                    proc_makecache.on('close', (code, signal) => {
                        if (signal) reject(`Subprocess killed by signal ${signal}`);
                        if (code) reject(`Subprocess exited with code ${code}`);
                        resolve();
                    });
                });
            }
            // Install the build-time dependencies.
            Logger.info(`Installing build-time dependencies of ${this._prettyPrint()}`);
            const proc_install = await build_container.run_in_container(["dnf", "install", "-y", ...Array.from(packages.values())], { stdio: 'pipe' }, [`--volume=/tmp/repo-${build_container.uuid}:/repo`]);
            Logger.logProcessOutput('multiple_install', proc_install);
            await new Promise((resolve, reject) => {
                proc_install.on('close', (code, signal) => {
                    if (signal) reject(`Process killed by signal ${signal}`);
                    if (code) reject(`Process exited with code ${code}`);
                    resolve();
                })
            });
            // Perform the build.
            Logger.info(`Running rpmbuild for ${this._prettyPrint()}`)
            const proc_build = await build_container.run_in_container(["rpmbuild", "-ba", "--verbose", ...Config.get().rpm_profiles[this.spec.profile].options, '/rpmbuild/SPECS/' + path.basename(this.spec.spec)]);
            Logger.logProcessOutput(`${this.spec.spec}:${this.spec.profile}`, proc_build);
            return new Promise((resolve, reject) => {
                proc_build.on('close', (code, signal) => {
                    if (signal) reject(`Process killed by signal ${signal}`);
                    if (code) reject(`Process exited with code ${code}`);
                    resolve();
                })
            }).then(() => {
                build_container.destroy();
                fs.promises.rmdir(`/tmp/repo-${build_container.uuid}`, { recursive: true });
            });
        }
    }
}

export class AxiomPackage extends Package {
    hash(): string {
        return `AxiomPackage[${this.name},${this.installed_on}]`;
    }

    _prettyPrint(): string {
        return `Axiom: ${this.name} from ${this.installed_on}`;
    }

    async installDependencies(): Promise<Set<Package>> {
        return new Set();
    }

    async buildDependencies(): Promise<Set<Package>> {
        return new Set();
    }

    private static installabilityCache = new Map<string, boolean>();

    private static readCache() {
        try {
            const json = JSON.parse(fs.readFileSync('install.cache').toString());
            for (const key in json) {
                AxiomPackage.installabilityCache.set(key, json[key]);
            }
        } catch (e) {
            Logger.warn(`Couldn't read installability cache: ${e}`);
        }
    }

    private static writeCache() {
        const json = {};
        AxiomPackage.installabilityCache.forEach((value, key) => {
            json[key] = value;
        });
        fs.writeFileSync("install.cache", JSON.stringify(json, undefined, 1));
    }

    async can_install(): Promise<boolean> {
        if (Config.get().build_images[this.installed_on].has_axioms) {
            AxiomPackage.readCache();
            const cache_key = `${this.name} ${this.installed_on}`;
            if (AxiomPackage.installabilityCache.has(cache_key)) {
                return AxiomPackage.installabilityCache.get(cache_key);
            } else {
                const proc = await (new Container(this.installed_on))
                    .run_in_image(["dnf", "--disablerepo=local-bootstrap", "provides", this.name], { stdio: 'pipe' });
                Logger.logProcessOutput(`${this.name}`, proc);
                return new Promise<boolean>((resolve, reject) => {
                    proc.on('close', (code, signal) => {
                        if (signal) reject(`Subprocess killed by signal ${signal}`);
                        if (code) resolve(false);
                        resolve(true);
                    });
                }).then(async (x) => {
                    AxiomPackage.installabilityCache.set(cache_key, x);
                    AxiomPackage.writeCache();
                    return x;
                });
            }
        } else {
            return false;
        }
    }
}
