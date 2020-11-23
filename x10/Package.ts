import { Config } from "./Config";
import { Container, image_name } from "./Container";
import { LogContext, Logger } from "./Logger";
import { dist_name, PackageNotFoundError, package_name, RPMDatabase, spec_with_options } from "./RPMDatabase";
import fs = require('fs');
import util = require('util');
import glob = require('glob');
import path = require('path');
import child_process = require('child_process');
import { Util } from "./Util";

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

export enum FailureType {
    failed = 1,
    not_built
}

export class BuiltPackage extends Package {
    spec: spec_with_options;
    unusable = false;
    log_context: LogContext;

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
        this.log_context = Logger.enterContext(`${name}: ${installed_on}`);
    }

    log(message: string) { Logger.log(this.log_context, message); }

    static failedPackages = new Map<string, FailureType>();
    markFailed(type: FailureType) { BuiltPackage.failedPackages.set(`${this.spec.spec},${this.spec.profile}`, type) }
    failed() { return BuiltPackage.failedPackages.get(`${this.spec.spec},${this.spec.profile}`) }

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

        function allBuiltPackages(list: unknown[]): list is BuiltPackage[] {
            return list.every(x => x instanceof BuiltPackage);
        }

        const ireqs = Config.get().build_images[build_image].install_packages;
        const ireq_packages =
            (await Promise.all(ireqs.map((ireq: string) => Package.resolve(ireq, build_image))))
            .filter(x => x instanceof BuiltPackage);
        if(!allBuiltPackages(ireq_packages)) throw new Error("ireq_packages?");
        const ireq_depends = (await Promise.all(ireq_packages.map(pkg => pkg.installDependencies()))).filter(x => x instanceof BuiltPackage);
        if(!allBuiltPackages(ireq_depends)) throw new Error("ireq_depends?");
        return new Set([...breq_packages, ...ireq_depends, ...ireq_packages]);
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

    async alreadyDone(): Promise<boolean> {
        return (!Config.ignoredExistingPackages.has(`${this.spec.spec}:${this.spec.profile}`))
            && await RPMDatabase.haveArtifacts(this.spec.spec, this.spec.profile);
    }

    async run(target?: string) {
        if (await this.alreadyDone()) {
            this.log(`Already have artifacts for ${this._prettyPrint()}.`)
        } else {
            this.log(`Running: ${this._prettyPrint()}`);
            const build_container = new Container(this.buildImage(), this.log_context, target);
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
            // Always create the repo dirs in case we don't actually have any repos (no bdeps, say)
            // so the --volumes don't blow up (hack)
            if (target) {
                child_process.spawnSync("ssh", [target, 'mkdir', '-p', `/tmp/repo-${build_container.uuid}`]);
            } else {
                await fs.promises.mkdir(`/tmp/repo-${build_container.uuid}`, { recursive: true });
            }

            try {
                // Rebuild the repository, if necessary.
                if (repos.size) {
                    const dist = Array.from(repos.values())[0];
                    if (target) {
                        // Rsync the repository to the remote machine. Should probably lock around this eventually based on target / dist
                        const proc_rsync = child_process.spawn("rsync", ['-av', '../rpmbuild/RPMS', `--include=*.${dist}.*.rpm`, '--include=*/', '--exclude=*', `${target}:/tmp/x10_repo_${dist}`]);
                        Logger.logProcessOutput(this.log_context, `${dist} rsync ${target}`, proc_rsync);
                        await Util.waitForProcess(proc_rsync);

                        // Copy it out so we don't have to wory about multiple instances of createrepo_c colliding.
                        const proc_copyrepo = child_process.spawn("ssh", [target, 'cp', '-r', `/tmp/x10_repo_${dist}`, `/tmp/repo-${build_container.uuid}`]);
                        Logger.logProcessOutput(this.log_context, `${dist} copyrepo`, proc_copyrepo);
                        await Util.waitForProcess(proc_copyrepo);
                    } else {
                        const files = await util.promisify(glob)(`../rpmbuild/RPMS/**/*.${dist}.*.rpm`);
                        await Promise.all(files.map(f => fs.promises.copyFile(f, path.join(`/tmp/repo-${build_container.uuid}`, path.basename(f)))))
                    }
                    // Run the actual createrepo_c job.
                    this.log(`Rebuilding repo ${dist} for ${build_container.uuid}`);
                    const proc_createrepo = await build_container.run_in_container(["createrepo_c", "/repo"], { stdio: 'pipe' }, [`--volume=/tmp/repo-${build_container.uuid}:/repo`]);
                    Logger.logProcessOutput(this.log_context, `${dist} repo`, proc_createrepo);
                    await Util.waitForProcess(proc_createrepo);

                    // Refresh the dnf cache.
                    // TODO is this actually required / can we make it not be
                    const proc_makecache = await build_container.run_in_container(["dnf", "makecache", "--repo", Config.get().build_images[build_container.image].repository], { stdio: 'pipe' }, [`--volume=/tmp/repo-${build_container.uuid}:/repo`]);
                    Logger.logProcessOutput(this.log_context, `${dist} cache`, proc_makecache);
                    await Util.waitForProcess(proc_makecache);
                }
                // Build a srpm locally.
                this.log(`Building srpm for ${this._prettyPrint()}`);
                // TODO we probably don't need to lock here
                const proc_srpm = await build_container.run_in_image(["rpmbuild", "-bs", "--verbose", ...Config.get().rpm_profiles[this.spec.profile].options, '/rpmbuild/SPECS/' + path.basename(this.spec.spec)], undefined, true, ['--volume', (await fs.promises.realpath("../rpmbuild")) + ':/rpmbuild']);
                Logger.logProcessOutput(this.log_context, `${path.basename(this.spec.spec)}:${this.spec.profile} srpm`, proc_srpm);
                await Util.waitForProcess(proc_srpm);

                // Install the build-time dependencies.
                if (packages.size) {
                    this.log(`Installing build-time dependencies of ${this._prettyPrint()}`);
                    const proc_install = await build_container.run_in_container(["dnf", "install", "-y", ...Array.from(packages.values())], { stdio: 'pipe' }, [`--volume=/tmp/repo-${build_container.uuid}:/repo`]);
                    Logger.logProcessOutput(this.log_context, `${path.basename(this.spec.spec)}:${this.spec.profile} depend_install`, proc_install);
                    await Util.waitForProcess(proc_install);
                }

                // Copy the srpm over.
                const srpm_name = await RPMDatabase.getSrpmFile(this.spec);
                const srpm = await fs.promises.readFile(`../rpmbuild/SRPMS/${srpm_name}.src.rpm`);
                const proc_setup_dirs = await build_container.run_in_container(["mkdir", "-p", "/rpmbuild/SRPMS"], { stdio: 'pipe' });
                Logger.logProcessOutput(this.log_context, `${path.basename(this.spec.spec)}:${this.spec.profile} setup_dirs`, proc_setup_dirs);
                await Util.waitForProcess(proc_setup_dirs);

                const proc_copy_srpm = await build_container.run_in_container(['sh', '-xc', `cat >/rpmbuild/SRPMS/${srpm_name}.src.rpm`], { stdio: 'pipe' });
                proc_copy_srpm.stdin.write(srpm);
                proc_copy_srpm.stdin.end();
                Logger.logProcessOutput(this.log_context, `${path.basename(this.spec.spec)}:${this.spec.profile} copy_srpm`, proc_copy_srpm);
                await Util.waitForProcess(proc_copy_srpm);

                // Perform the build.
                this.log(`Running rpmbuild for ${this._prettyPrint()}`)
                const proc_build = await build_container.run_in_container(["rpmbuild", "-rb", "--verbose", ...Config.get().rpm_profiles[this.spec.profile].options, `/rpmbuild/SRPMS/${srpm_name}.src.rpm`]);
                Logger.logProcessOutput(this.log_context, `${path.basename(this.spec.spec)}:${this.spec.profile}`, proc_build);
                await Util.waitForProcess(proc_build);

                // Get our artifacts back.
                const proc_gather = await build_container.run_in_container(["tar", "cv", "-C", "/rpmbuild/RPMS", "."], { stdio: 'pipe' });
                // TODO should we try to lock around this extract and the repo rsync?
                const proc_extract = child_process.spawn("tar", ["xv", "-C", "../rpmbuild/RPMS"], { stdio: 'pipe' });
                Logger.logProcessOutput(this.log_context, `${path.basename(this.spec.spec)}:${this.spec.profile} gather`, proc_gather, true);
                Logger.logProcessOutput(this.log_context, `${path.basename(this.spec.spec)}:${this.spec.profile} extract`, proc_extract, true);
                proc_gather.stdout.pipe(proc_extract.stdin);
                await Promise.all([Util.waitForProcess(proc_gather), Util.waitForProcess(proc_extract)]);
            } catch (e) {
                this.log(`Got error from build: ${e}`);
                const proc_find = await build_container.run_in_container(["find", "/rpmbuild/BUILDROOT/"], { stdio: 'pipe' });
                Logger.logProcessOutput(this.log_context, `${path.basename(this.spec.spec)}:${this.spec.profile} find`, proc_find);
                await Util.waitForProcess(proc_find);
                const proc_ls = await build_container.run_in_container(["sh", "-c", "ls -l /rpmbuild/BUILD/*"], { stdio: 'pipe' });
                Logger.logProcessOutput(this.log_context, `${path.basename(this.spec.spec)}:${this.spec.profile} ls`, proc_ls);
                await Util.waitForProcess(proc_ls);
                throw e;
            } finally {
                build_container.destroy();
                if (target) {
                    child_process.spawnSync("ssh", [target, 'rm', '-rf', `/tmp/repo-${build_container.uuid}`]);
                } else {
                    await fs.promises.rmdir(`/tmp/repo-${build_container.uuid}`, { recursive: true });
                }
            }
        }
    }

    buildImage(): string {
        return Config.get().rpm_profiles[this.spec.profile].image;
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
            Logger.log(undefined, `Couldn't read installability cache: ${e}`);
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
                const proc = await (new Container(this.installed_on, undefined))
                    .run_in_image(["dnf", "--disablerepo=local-bootstrap", "provides", this.name], { stdio: 'pipe' });
                Logger.logProcessOutput(undefined, `${this.name}`, proc);
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
