import * as child_process from 'child_process';
import * as path from 'path';

import { Config } from './Config';
import { Repository } from './Repository';
import { Database } from './Database';
import { Atom, ResolvedAtom } from './Atom';
import { PackageDescription } from './PackageDescription';
import { BuildContext } from './BuildContext';

function mapAsync<T, U>(array: T[], callbackfn: (value: T, index: number, array: T[]) => Promise<U>): Promise<U[]> {
    return Promise.all(array.map(callbackfn));
}

async function filterAsync<T>(array: T[], callbackfn: (value: T, index: number, array: T[]) => Promise<boolean>): Promise<T[]> {
    const filterMap = await mapAsync(array, callbackfn);
    return array.filter((value, index) => filterMap[index]);
}

export class Commands {
    private static async _getRecursiveFilteredDependencies(atom: ResolvedAtom, hostdb: Database, repo: Repository, desc_cache: Map<string, PackageDescription>, already_found?: Set<string>): Promise<ResolvedAtom[]> {
        if (!desc_cache.get(atom.format())) desc_cache.set(atom.format(), await repo.getPackageDescription(atom));
        const desc = desc_cache.get(atom.format());
        const filtered_bdepend = filterAsync(desc.bdepend, async (depend) => {
            if (already_found.has(depend.format())) return false;
            already_found.add(depend.format());
            if (!desc_cache.get(depend.format())) desc_cache.set(depend.format(), await repo.getPackageDescription(depend));
            const depend_desc = desc_cache.get(depend.format());
            if (depend_desc.version.compare(hostdb.getInstalledVersion(depend)) == 0) {
                return false;
            }
            return true;
        });

        const filtered_rdepend = filterAsync(desc.rdepend, async (depend) => {
            if (already_found.has(depend.format())) return false;
            already_found.add(depend.format());
            if (!desc_cache.get(depend.format())) desc_cache.set(depend.format(), await repo.getPackageDescription(depend));
            const depend_desc = desc_cache.get(depend.format());
            if (depend_desc.version.compare(hostdb.getInstalledVersion(depend)) == 0
                && await repo.buildExists(depend)) {
                return false;
            }
            return true;
        });

        // please don't aspire to be like me.
        const depends = Array.from(new Set((await filtered_bdepend).concat(await filtered_rdepend).map(a => a.format())).values()).map(s => new ResolvedAtom(s));
        const depends_final: Set<string> = new Set();
        for (const depend of depends) {
            if (!desc_cache.get(depend.format())) desc_cache.set(depend.format(), await repo.getPackageDescription(depend));
            const subdepends = await Commands._getRecursiveFilteredDependencies(depend, hostdb, repo, desc_cache, already_found);
            subdepends.forEach(d => depends_final.add(d.format()));
            depends_final.add(depend.format());
        }

        return Array.from(depends_final.values()).map(s => new ResolvedAtom(s));
    }

    static async buildPackages(package_names: string[]): Promise<boolean> {
        let rc = true;
        const buildah_from = child_process.spawn('buildah', ['from', Config.build_container]);
        let container_id: string = "";
        buildah_from.stdout.on('data', (data) => container_id += data.toString('utf8'));

        const buildah_from_p = new Promise((res, rej) => {
            buildah_from.on('exit', () => res());
            buildah_from.on('error', () => rej());
        });

        const repo = new Repository(Config.repository);
        interface step { atom: ResolvedAtom, depends: Set<ResolvedAtom> };
        let plan: step[] = [];

        await buildah_from_p;
        container_id = container_id.trim();
        console.log(`Have working container: ${container_id}`);
        let container_mounted = false;
        try {
            const mount_rc = child_process.spawnSync('buildah', ['mount', container_id]);
            if (mount_rc.signal) throw `mount killed by signal ${mount_rc.signal}`;
            if (mount_rc.status != 0) throw `mount exited with failure status`;
            container_mounted = true;
            const mountpoint = mount_rc.stdout.toString().trim();
            console.log(`Container root at ${mountpoint}`);

            const hostdb = (Config.without_hostdb) ? Database.empty() : Database.construct(path.join(mountpoint, 'var/lib/x10/database/'));

            const atoms = await Promise.all(package_names.map((p) => new Atom(p).resolveUsingRepository(repo)));

            let resolved: Set<string> = new Set();
            let remaining: Set<string> = new Set();
            let descs: Map<string, PackageDescription> = new Map();

            for (const atom of atoms) {
                remaining.add(atom.format());
                const desc = await repo.getPackageDescription(atom);
                // This is kind of a bodge so that when you `build virtual/base-system` it behaves as expected
                // not sure if that's how we always want to do it
                desc.rdepend.forEach(rdepend => remaining.add(rdepend.format()));
            }

            console.log(remaining);

            let last_remaining: Set<string> = new Set(remaining);
            let iterations = 0;
            while (remaining.size) {
                for (const str of remaining.values()) {
                    const atom = new ResolvedAtom(str);
                    let desc = descs.get(str);
                    if (!desc) descs.set(str, desc = await repo.getPackageDescription(atom));

                    const depends = await Commands._getRecursiveFilteredDependencies(atom, hostdb, repo, descs, new Set());

                    if (depends.every(a => resolved.has(a.format()))) {
                        if (await repo.buildExists(atom)) {
                            //console.log(`==> Found existing build for ${atom.format()}`);
                            // don't have to build this!
                        } else {
                            plan.push({ atom: atom, depends: new Set(depends) });
                        }
                        resolved.add(atom.format());
                        remaining.delete(atom.format());
                    } else {
                        depends.forEach((depend) => {
                            if (!resolved.has(depend.format())) {
                                remaining.add(depend.format());
                            }
                        });
                    }
                    process.stdout.write(`==> Cycle ${iterations} - ${resolved.size} resolved, ${remaining.size} unresolved\x1b[K\r`);
                }
                process.stdout.write("\n");
                iterations++;
                if (Array.from(last_remaining.values()).every((a) => remaining.has(a))) {
                    // We have a dependency cycle. Let's go ahead and pick some unlucky package to go first.
                    let target: ResolvedAtom;
                    const candidates = Array.from(last_remaining.values());

                    // prefer virtual packages here
                    for (const candidate of candidates) {
                        if (new ResolvedAtom(candidate).getCategory() == 'virtual') {
                            target = new ResolvedAtom(candidate);
                            break;
                        }
                    }
                    if (!target) {
                        for (const candidate of candidates) {
                            let desc = descs.get(candidate);
                            if (!desc) descs.set(candidate, desc = await repo.getPackageDescription(new ResolvedAtom(candidate)));
                        }

                        // prefer packages with fewer bdepends
                        const candidates_sorted = candidates.sort((a, b) =>
                            descs.get(a).bdepend.length - descs.get(b).bdepend.length
                        );

                        target = new ResolvedAtom(candidates_sorted[0]);
                    }

                    let desc = descs.get(target.format());
                    if (!desc) descs.set(target.format(), desc = await repo.getPackageDescription(target));

                    const depends = await Commands._getRecursiveFilteredDependencies(target, hostdb, repo, descs, new Set());

                    const depends_in: ResolvedAtom[] = [];
                    const depends_out: string[] = [];

                    for (const depend of depends) {
                        if (resolved.has(depend.format())) {
                            depends_in.push(depend);
                        } else {
                            depends_out.push(depend.format());
                        }
                    }

                    if (await repo.buildExists(target)) {
                        //console.log(`==> Found existing build for ${target.format()}`);
                        // don't have to build this!
                    } else {
                        if (depends_out.length) {
                            console.log(`-!- Package ${target.format()} will be built without its ${depends_out.join(', ')} dependencies.`);
                        }
                        plan.push({ atom: target, depends: new Set(depends_in) });
                    }
                    resolved.add(target.format());
                    remaining.delete(target.format());
                }
                last_remaining = new Set(remaining);
            }

            for (const step of plan) {
                console.log(`${step.atom.format()}\x1b[30G${Array.from(step.depends.values()).map(a => a.format()).join(' ')}`);
            }
        } catch (e) {
            console.error(`Got error: ${e}`);
            console.error(e);
            rc = false;
        } finally {
            console.log("Cleaning up...");
            if (container_mounted) child_process.spawnSync('buildah', ['umount', container_id], { stdio: 'inherit' });
            child_process.spawnSync('buildah', ['rm', container_id], { stdio: 'inherit' });
        }

        if (rc) {
            for (const step of plan) {
                if (step.atom.getCategory() == 'virtual') continue;
                console.log(`Building: ${step.atom.format()}`);
                const success = await Commands.buildSingle(step.atom, step.depends);
                if (!success) {
                    rc = false;
                    break;
                }
            }
        }

        return rc;
    }

    static async buildSingle(atom: ResolvedAtom, host_install: Set<ResolvedAtom>): Promise<boolean> {
        let rc = true;
        const buildah_from = child_process.spawn('buildah', ['from', Config.build_container]);
        let container_id: string = "";
        buildah_from.stdout.on('data', (data) => container_id += data.toString('utf8'));

        const buildah_from_p = new Promise((res, rej) => {
            buildah_from.on('exit', () => res());
            buildah_from.on('error', () => rej());
        });

        const repo = new Repository(Config.repository);
        await buildah_from_p;
        container_id = container_id.trim();
        console.log(`Have working container: ${container_id}`);
        let container_mounted = false;
        try {
            const mount_rc = child_process.spawnSync('buildah', ['mount', container_id]);
            if (mount_rc.signal) throw `mount killed by signal ${mount_rc.signal}`;
            if (mount_rc.status != 0) throw `mount exited with failure status`;
            container_mounted = true;
            const mountpoint = mount_rc.stdout.toString().trim();
            console.log(`Container root at ${mountpoint}`);

            const hostdb = (Config.without_hostdb) ? Database.empty() : Database.construct(path.join(mountpoint, 'var/lib/x10/database/'));
            await repo.installPackages(host_install, hostdb, mountpoint);
            
            const pkgdesc: PackageDescription = await repo.getPackageDescription(atom);
            const ctx = new BuildContext(container_id, mountpoint);
            await ctx.build(atom, pkgdesc, repo);
        } catch (e) {
            console.error(`Got error: ${e}`);
            console.error(e);
            rc = false;
        } finally {
            console.log("Cleaning up...");
            if (container_mounted) child_process.spawnSync('buildah', ['umount', container_id], { stdio: 'inherit' });
            child_process.spawnSync('buildah', ['rm', container_id], { stdio: 'inherit' });
        }
        return rc;
    }
};