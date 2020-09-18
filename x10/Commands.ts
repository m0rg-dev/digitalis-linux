import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import { Config } from './Config';
import { Repository } from './Repository';
import { Database } from './Database';
import { Atom, AtomUtils } from './Atom';
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
    private static async _getRecursiveFilteredDependencies(atom: Atom, hostdb: Database, repo: Repository, desc_cache: Map<Atom, PackageDescription>, already_found?: Set<Atom>): Promise<Atom[]> {
        if (!desc_cache.get(atom)) desc_cache.set(atom, await repo.getPackageDescription(atom));
        const desc = desc_cache.get(atom);
        const filtered_bdepend = filterAsync(desc.bdepend, async (depend) => {
            if (already_found.has(depend)) return false;
            already_found.add(depend);
            if (!desc_cache.get(depend)) desc_cache.set(depend, await repo.getPackageDescription(depend));
            const depend_desc = desc_cache.get(depend);
            if (depend_desc.version.compare(hostdb.getInstalledVersion(depend)) == 0
                && await repo.buildExists(depend)) {
                return false;
            }
            return true;
        });

        const filtered_rdepend = filterAsync(desc.rdepend, async (depend) => {
            if (already_found.has(depend)) return false;
            already_found.add(depend);
            if (!desc_cache.get(depend)) desc_cache.set(depend, await repo.getPackageDescription(depend));
            const depend_desc = desc_cache.get(depend);
            if (depend_desc.version.compare(hostdb.getInstalledVersion(depend)) == 0
                && await repo.buildExists(depend)) {
                return false;
            }
            return true;
        });

        // as far as I can tell this is actually the easiest way to deduplicate an array
        const depends = Array.from(new Set((await filtered_bdepend).concat(await filtered_rdepend)));
        const depends_final: Set<string> = new Set();
        for (const depend of depends) {
            if (!desc_cache.get(depend)) desc_cache.set(depend, await repo.getPackageDescription(depend));
            const subdepends = await Commands._getRecursiveFilteredDependencies(depend, hostdb, repo, desc_cache, already_found);
            subdepends.forEach(d => depends_final.add(d));
            depends_final.add(depend);
        }

        return Array.from(depends_final.values());
    }

    private static async runWithContainer(callback: (container_id: string, mountpoint: string) => Promise<boolean>): Promise<boolean> {
        let rc = true;
        const buildah_from = child_process.spawn('buildah', ['from', Config.build_container]);
        let container_id: string = "";
        buildah_from.stdout.on('data', (data) => container_id += data.toString('utf8'));

        const buildah_from_p = new Promise((res, rej) => {
            buildah_from.on('exit', () => res());
            buildah_from.on('error', () => rej());
        });

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

            rc = await callback(container_id, mountpoint);
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

    static async buildPackages(package_names: string[]): Promise<boolean> {
        let rc = true;

        const repo = new Repository(Config.repository);
        interface step { atom: Atom, depends: Set<Atom> };
        let plan: step[] = [];

        rc = await Commands.runWithContainer(async (container_id, mountpoint) => {
            const hostdb = (Config.without_hostdb) ? Database.empty() : Database.construct(path.join(mountpoint, 'var/lib/x10/database/'));

            const atoms = await Promise.all(package_names.map((p) => AtomUtils.resolveUsingRepository(p, repo)));

            const resolved: Set<Atom> = new Set();
            const remaining: Set<Atom> = new Set();
            const descs: Map<Atom, PackageDescription> = new Map();

            for (const atom of atoms) {
                remaining.add(atom);
                const desc = await repo.getPackageDescription(atom);
                // This is kind of a bodge so that when you `build virtual/base-system` it behaves as expected
                // not sure if that's how we always want to do it
                desc.rdepend.forEach(rdepend => remaining.add(rdepend));
            }

            console.log(remaining);

            let last_remaining: Set<Atom> = new Set(remaining);
            let iterations = 0;
            while (remaining.size) {
                for (const atom of remaining.values()) {
                    let desc = descs.get(atom);
                    if (!desc) descs.set(atom, desc = await repo.getPackageDescription(atom));

                    const depends = await Commands._getRecursiveFilteredDependencies(atom, hostdb, repo, descs, new Set());

                    if (depends.every(a => resolved.has(a))) {
                        if (await repo.buildExists(atom)) {
                            //console.log(`==> Found existing build for ${atom}`);
                            // don't have to build this!
                        } else {
                            plan.push({ atom: atom, depends: new Set(depends) });
                        }
                        resolved.add(atom);
                        remaining.delete(atom);
                    } else {
                        depends.forEach((depend) => {
                            if (!resolved.has(depend)) {
                                remaining.add(depend);
                            }
                        });
                    }
                    process.stdout.write(`==> Cycle ${iterations} - ${resolved.size} resolved, ${remaining.size} unresolved\x1b[K\r`);
                }
                process.stdout.write("\n");
                iterations++;
                if (Array.from(last_remaining.values()).every((a) => remaining.has(a))) {
                    // We have a dependency cycle. Let's go ahead and pick some unlucky package to go first.
                    let target: Atom;
                    const candidates = Array.from(last_remaining.values());

                    // prefer virtual packages here
                    for (const candidate of candidates) {
                        if (AtomUtils.getCategory(candidate) == 'virtual') {
                            target = candidate;
                            break;
                        }
                    }
                    if (!target) {
                        for (const candidate of candidates) {
                            let desc = descs.get(candidate);
                            if (!desc) descs.set(candidate, desc = await repo.getPackageDescription(candidate));
                        }

                        // prefer packages with fewer bdepends
                        const candidates_sorted = candidates.sort((a, b) =>
                            descs.get(a).bdepend.length - descs.get(b).bdepend.length
                        );

                        target = candidates_sorted[0];
                    }

                    let desc = descs.get(target);
                    if (!desc) descs.set(target, desc = await repo.getPackageDescription(target));

                    const depends = await Commands._getRecursiveFilteredDependencies(target, hostdb, repo, descs, new Set());

                    const depends_in: Atom[] = [];
                    const depends_out: string[] = [];

                    for (const depend of depends) {
                        if (resolved.has(depend)) {
                            depends_in.push(depend);
                        } else {
                            depends_out.push(depend);
                        }
                    }

                    if (await repo.buildExists(target)) {
                        //console.log(`==> Found existing build for ${target}`);
                        // don't have to build this!
                    } else {
                        if (depends_out.length) {
                            console.log(`-!- Package ${target} will be built without its ${depends_out.join(', ')} dependencies.`);
                        }
                        plan.push({ atom: target, depends: new Set(depends_in) });
                    }
                    resolved.add(target);
                    remaining.delete(target);
                }
                last_remaining = new Set(remaining);
            }

            for (const step of plan) {
                console.log(`${step.atom}\x1b[30G${Array.from(step.depends.values()).join(' ')}`);
            }
            return true;
        });

        if (rc) {
            for (const step of plan) {
                if (AtomUtils.getCategory(step.atom) == 'virtual') continue;
                console.log(`Building: ${step.atom}`);
                const success = await Commands.buildSingle(step.atom, step.depends);
                if (!success) {
                    rc = false;
                    break;
                }
            }
        }

        return rc;
    }

    static async buildSingle(atom: Atom, host_install: Set<Atom>): Promise<boolean> {
        const repo = new Repository(Config.repository);
        return Commands.runWithContainer(async (container_id, mountpoint) => {
            const hostdb = (Config.without_hostdb) ? Database.empty() : Database.construct(path.join(mountpoint, 'var/lib/x10/database/'));
            await Commands.installResolvedPackages(host_install, repo, hostdb, mountpoint);

            const pkgdesc: PackageDescription = await repo.getPackageDescription(atom);
            const ctx = new BuildContext(container_id, mountpoint);
            await ctx.build(atom, pkgdesc, repo);
            return true;
        });
    }

    static async installPackages(atoms: Set<Atom>, repo: Repository, db: Database, target_root: string) {
        const resolved: Set<Atom> = new Set();
        const remaining: Set<Atom> = new Set(atoms);
        const descs: Map<Atom, PackageDescription> = new Map();
        const ordered_packages: Atom[] = [];

        let last_remaining = new Set(remaining);
        let iterations = 0;

        while (remaining.size) {
            for (const atom of remaining.values()) {
                let desc = descs.get(atom);
                if (!desc) descs.set(atom, desc = await repo.getPackageDescription(atom));

                if (!desc.version.compare(db.getInstalledVersion(atom))) {
                    resolved.add(atom);
                    remaining.delete(atom);
                    ordered_packages.push(atom);
                } else if (desc.rdepend.every(a => resolved.has(a))) {
                    resolved.add(atom);
                    remaining.delete(atom);
                    ordered_packages.push(atom);
                } else {
                    desc.rdepend.forEach((depend) => {
                        if (!resolved.has(depend)) {
                            remaining.add(depend);
                        }
                    });
                }
                process.stdout.write(`==> Cycle ${iterations} - ${resolved.size} resolved, ${remaining.size} unresolved\x1b[K\r`);
            }
            process.stdout.write("\n");
            iterations++;
            if (Array.from(last_remaining.values()).every((a) => remaining.has(a))) {
                // We have a dependency cycle. Let's go ahead and pick some unlucky package to go first.
                let target: Atom;
                const candidates = Array.from(last_remaining.values());

                // prefer virtual packages here
                for (const candidate of candidates) {
                    if (AtomUtils.getCategory(candidate) == 'virtual') {
                        target = candidate;
                        break;
                    }
                }
                if (!target) {
                    for (const candidate of candidates) {
                        let desc = descs.get(candidate);
                        if (!desc) descs.set(candidate, desc = await repo.getPackageDescription(candidate));
                    }

                    // prefer packages with fewer rdepends
                    const candidates_sorted = candidates.sort((a, b) =>
                        descs.get(a).rdepend.length - descs.get(b).rdepend.length
                    );

                    target = candidates_sorted[0];
                }

                let desc = descs.get(target);
                if (!desc) descs.set(target, desc = await repo.getPackageDescription(target));

                const depends_in: Atom[] = [];
                const depends_out: string[] = [];

                for (const depend of desc.rdepend) {
                    if (resolved.has(depend)) {
                        depends_in.push(depend);
                    } else {
                        depends_out.push(depend);
                    }
                }

                if (!desc.version.compare(db.getInstalledVersion(target))) {
                    //console.log(`==> Found existing build for ${target}`);
                    // don't have to build this!
                } else {
                    if (depends_out.length) {
                        console.log(`-!- Package ${target} will be installed before its ${depends_out.join(', ')} dependencies.`);
                    }

                }
                resolved.add(target);
                remaining.delete(target);
                ordered_packages.push(target);
            }
            last_remaining = new Set(remaining);
        }

        const hooks_pending = new Set<string>();
        for (const atom of ordered_packages) {
            await Commands.installSingle(atom, repo, db, target_root, hooks_pending);
        }

        if (hooks_pending.has('ldconfig')) {
            console.log("Running ldconfig...");
            child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
        }
    }

    static async installResolvedPackages(atoms: Set<Atom>, repo: Repository, db: Database, target_root: string) {
        const scratch_atoms = new Set(atoms);
        const ordered_atoms: Atom[] = [];
        const descs: Map<Atom, PackageDescription> = new Map();
        const hooks_pending = new Set<string>();

        while (scratch_atoms.size) {
            for (const atom of scratch_atoms.values()) {
                let desc = descs.get(atom);
                if (!desc) descs.set(atom, desc = await repo.getPackageDescription(atom));

                if (desc.rdepend.every((a) => !scratch_atoms.has(a))) {
                    ordered_atoms.push(atom);
                    scratch_atoms.delete(atom);
                }
            }
        }

        for (const atom of ordered_atoms) {
            await Commands.installSingle(atom, repo, db, target_root, hooks_pending);
        }

        if (hooks_pending.has('ldconfig')) {
            console.log("Running ldconfig...");
            child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
        }
    }

    // TODO hooks stuff
    static async installSingle(atom: Atom, repo: Repository, db: Database, target_root: string, hooks_pending: Set<string>) {
        const pkgdesc: PackageDescription = await repo.getPackageDescription(atom);
        console.log(`Installing ${atom} ${pkgdesc.version.version} to ${target_root}`);
        db.install_pending(atom);
        if (AtomUtils.getCategory(atom) != 'virtual') {
            // TODO this should probably be a method on Repository
            const build_path = await fs.promises.realpath(path.join(repo.local_builds_path, atom + "," + pkgdesc.version.version + ".tar.xz"));

            const flist_rc = child_process.spawnSync('tar', ['xJf', build_path, `./var/lib/x10/database/${atom}.list`, '-O'],
                { maxBuffer: 16 * 1024 * 1024 });
            const file_list = JSON.parse(flist_rc.stdout.toString());

            // running this in a transaction makes me feel real cool about it
            // (come back to this!)
            db.transaction(() => {
                for (const file of file_list) {
                    db.add_file(atom, file.name, file.type);
                }
            });

            const rc = child_process.spawnSync('tar', ['xpJvf', build_path], {
                cwd: target_root,
                stdio: ['ignore', 'pipe', 'inherit']
            });
            if (rc.signal) throw `unpack killed by signal ${rc.signal}`;
            if (rc.status != 0) throw `unpack exited with failure status`;

            // begin file-based hooks

            for (const file of rc.stdout.toString().split('\n')) {
                if (file.endsWith('.so')) {
                    hooks_pending.add('ldconfig');
                }
            }

            // end file-based hooks
        }
        if (pkgdesc.post_unpack_script) {
            // in case the post-unpack script needs it
            if (hooks_pending.has('ldconfig')) {
                console.log("Running ldconfig...");
                child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
                hooks_pending.delete('ldconfig');
            }
            console.log(`Running post-unpack script for ${atom}`);
            child_process.spawnSync('chroot', ['.', 'bash', '-c', pkgdesc.post_unpack_script], { stdio: 'inherit', cwd: target_root });
        }
        db.install(atom, pkgdesc.version);
    }
};