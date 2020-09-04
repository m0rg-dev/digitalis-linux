import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import { Config } from './Config';
import { Repository } from './Repository';
import { Database } from './Database';
import { Transaction, Location, StepType } from './Transaction';
import { Atom } from './Atom';
import { PackageDescription } from './PackageDescription';

export class Commands {
    static async Build(package_names: string[]) {
        // We basically always want to do this because we're not actually installing to a target
        // so our "targetdb" is going to be entirely bogus.
        Config.use_default_depends = false;
        const buildah_from = child_process.spawn('buildah', ['from', Config.build_container]);
        var container_id: string = "";
        buildah_from.stdout.on('data', (data) => container_id += data.toString('utf8'));

        const buildah_from_p = new Promise((res, rej) => {
            buildah_from.on('exit', () => res());
            buildah_from.on('error', () => rej());
        });

        const repo = new Repository(Config.repository);
        const targetdb = Database.empty();
        await buildah_from_p;
        container_id = container_id.trim();
        console.log(`Have working container: ${container_id}`);
        var container_mounted = false;
        try {
            const mount_rc = child_process.spawnSync('buildah', ['mount', container_id]);
            if (mount_rc.signal) throw `mount killed by signal ${mount_rc.signal}`;
            if (mount_rc.status != 0) throw `mount exited with failure status`;
            container_mounted = true;
            var mountpoint = mount_rc.stdout.toString().trim();
            console.log(`Container root at ${mountpoint}`);

            const hostdb = (Config.without_hostdb) ? Database.empty() : Database.construct(path.join(mountpoint, 'var/lib/x10/database/'));
            console.log(hostdb);
            const tx = new Transaction(repo, hostdb, targetdb);

            await Promise.all(package_names.map(async function (shortpkg: string) {
                const resolved = await (new Atom(shortpkg)).resolveUsingRepository(repo);
                await tx.addToTransaction(resolved, Location.Target, true);
            }));
            const plan = await tx.plan();
            Transaction.displayPlan(plan);

            var hostinstalls = [];

            for (const step of plan) {
                if (step.type == StepType.Build) {
                    if (hostinstalls.length) {
                        await repo.installPackages(hostinstalls, hostdb, mountpoint);
                        hostinstalls = [];
                    }
                    const pkgdesc: PackageDescription = await repo.getPackageDescription(step.what);
                    const build_path = path.join(repo.local_builds_path, step.what.getCategory(), step.what.getName() + "," + pkgdesc.version.version + ".tar.xz");
                    if (!fs.existsSync(build_path)) await repo.buildPackage(step.what, container_id, mountpoint);
                } else if (step.type == StepType.HostInstall) {
                    hostinstalls.push(step.what);
                }
            }
        } catch (e) {
            console.error(`Got error: ${e}`);
            console.error(e);
            process.exitCode = 1;
        } finally {
            console.log("Cleaning up...");
            if (container_mounted) child_process.spawnSync('buildah', ['umount', container_id], { stdio: 'inherit' });
            child_process.spawnSync('buildah', ['rm', container_id], { stdio: 'inherit' });
        }
    }
};