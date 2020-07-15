import * as minimist from 'minimist';
import { Config } from './config';
import { Repository, PackageDescription } from './repo';
import { Database } from './db';
import { Transaction, Location, StepType } from './transaction';
import { Atom, ResolvedAtom } from './atom';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as byteSize from 'byte-size';
import { report } from 'process';

byteSize.defaultOptions({
    units: 'iec'
});

const argv = minimist(process.argv.slice(2), {
    string: ["host_root", "target_root", "repository", "build_container", "remote_url"],
    boolean: ["without_default_depends", "skip_confirm", "unshared"]
});

Config.setConfigKey('use_default_depends', !argv.without_default_depends);

async function build_packages(argv: any) {
    // We basically always want to do this because we're not actually installing to a target
    // so our "targetdb" is going to be entirely bogus.
    Config.setConfigKey('use_default_depends', false);
    const buildah_from = child_process.spawn('buildah', ['from', argv.build_container || 'digitalis-builder']);
    var container_id: string = "";
    buildah_from.stdout.on('data', (data) => container_id += data.toString('utf8'));

    const buildah_from_p = new Promise((res, rej) => {
        buildah_from.on('exit', () => res());
        buildah_from.on('error', () => rej());
    });

    const repo = new Repository(argv.repository || '/var/lib/rpkg/repo');
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

        const hostdb = await Database.construct(path.join(mountpoint, 'var/lib/rpkg/database/'));
        console.log(hostdb);
        const tx = new Transaction(repo, hostdb, targetdb);

        await Promise.all(argv._.slice(1).map(async function (shortpkg: string) {
            const resolved = await (new Atom(shortpkg)).resolveUsingRepository(repo);
            await tx.addToTransaction(resolved, Location.Target, true);
        }));
        const plan = await tx.plan();
        Transaction.displayPlan(plan);

        for(const step of plan) {
            if(step.type == StepType.Build) {
                const pkgdesc: PackageDescription = await repo.getPackageDescription(step.what);
                const build_path = path.join(repo.local_builds_path, step.what.getCategory(), step.what.getName() + "," + pkgdesc.version.version + ".tar.xz");
                if(!fs.existsSync(build_path)) await repo.buildPackage(step.what, container_id);
            } else if(step.type == StepType.HostInstall) {
                await repo.installPackage(step.what, hostdb, mountpoint);
            }
        }
    } catch (e) {
        console.error(`Got error: ${e}`);
        process.exitCode = 1;
    } finally {
        console.log("Cleaning up...");
        if (container_mounted) child_process.spawnSync('buildah', ['umount', container_id], { stdio: 'inherit' });
        child_process.spawnSync('buildah', ['rm', container_id], { stdio: 'inherit' });
    }
}

async function main() {
    if(argv.repository) argv.repository = path.resolve(argv.repository);

    if (argv._.length > 0) {
        if (argv._[0] == 'install') {
            const repo = new Repository(argv.repository || '/var/lib/rpkg/repo', argv.remote_url);
            const hostdb = await Database.construct((argv.host_root || '') + '/var/lib/rpkg/database/');
            const targetdb = await Database.construct((argv.target_root || '') + '/var/lib/rpkg/database/');
            const tx = new Transaction(repo, hostdb, targetdb);

            await Promise.all(argv._.slice(1).map(async function (shortpkg) {
                const resolved = await (new Atom(shortpkg)).resolveUsingRepository(repo);
                await tx.addToTransaction(resolved, Location.Target);
            }));
            const plan = await tx.plan();
            Transaction.displayPlan(plan);

            for (const step of plan) {
                if (step.type == StepType.Build) {
                    console.log("\nThis plan would require packages to be compiled from source.");
                    process.exit(1);
                } else if (step.type == StepType.TargetInstall) {
                    await repo.installPackage(step.what, targetdb, (argv.target_root || '/'));
                }
            }

            // in case hostdb == targetdb
            // TODO this needs to be *way* more formalized
            await targetdb.reload();

            argv._.slice(1).map(async function (shortpkg) {
                const resolved = await (new Atom(shortpkg)).resolveUsingRepository(repo);
                targetdb.select(resolved);
            });

            await targetdb.commit();
        } else if (argv._[0] == 'build') {
            if (argv.unshared) {
                await build_packages(argv);
            } else {
                child_process.spawnSync('buildah', ['unshare', '--'].concat(process.argv).concat('--unshared'), { stdio: 'inherit' });
            }
        } else if (argv._[0] == 'update') {
            const repo = new Repository(argv.repository || '/var/lib/rpkg/repo', argv.remote_url);
            const db = await Database.construct((argv.target_root || '') + '/var/lib/rpkg/database/');

            const manifest = await repo.maybeUpdateManifest();
            for (const pkg of manifest.getAllPackages()) {
                if(db.getInstalledVersion(pkg.atom) && pkg.version.compare(db.getInstalledVersion(pkg.atom))) {
                    console.log(`Found outdated package: ${pkg.atom.format()}`);
                }
            }

        } else if (argv._[0] == '_get_builds_for') {
            const repo = new Repository(argv.repository || '/var/lib/rpkg/repo');
            const hostdb = await Database.construct((argv.host_root || '') + '/var/lib/rpkg/database/');
            const targetdb = await Database.construct((argv.target_root || '') + '/var/lib/rpkg/database/');
            const tx = new Transaction(repo, hostdb, targetdb);

            await Promise.all(argv._.slice(1).map(async function (shortpkg) {
                const resolved = await (new Atom(shortpkg)).resolveUsingRepository(repo);
                await tx.addToTransaction(resolved, Location.Target);
            }));
            const plan = await tx.plan();
            for (const step of plan) {
                if (step.type == StepType.Build) {
                    console.log(step.what.format());
                }
            }
        }
    } else {
        print_help();
    }
}

function print_help() {
    console.log("Usage: rpkg [options] <action> [packages]");
}

try {
    main();
} catch (e) {
    console.error(e);
    process.exitCode = 1;
}