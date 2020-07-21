"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimist = require("minimist");
const config_1 = require("./config");
const repo_1 = require("./repo");
const db_1 = require("./db");
const transaction_1 = require("./transaction");
const atom_1 = require("./atom");
const child_process = require("child_process");
const path = require("path");
const fs = require("fs");
const byteSize = require("byte-size");
byteSize.defaultOptions({
    units: 'iec'
});
const argv = minimist(process.argv.slice(2), {
    string: ["host_root", "target_root", "repository", "build_container", "remote_url"],
    boolean: ["without_default_depends", "skip_confirm", "unshared"]
});
config_1.Config.setConfigKey('use_default_depends', !argv.without_default_depends);
async function build_packages(argv) {
    // We basically always want to do this because we're not actually installing to a target
    // so our "targetdb" is going to be entirely bogus.
    config_1.Config.setConfigKey('use_default_depends', false);
    const buildah_from = child_process.spawn('buildah', ['from', argv.build_container || 'digitalis-builder']);
    var container_id = "";
    buildah_from.stdout.on('data', (data) => container_id += data.toString('utf8'));
    const buildah_from_p = new Promise((res, rej) => {
        buildah_from.on('exit', () => res());
        buildah_from.on('error', () => rej());
    });
    const repo = new repo_1.Repository(argv.repository || '/var/lib/rpkg/repo');
    const targetdb = db_1.Database.empty();
    await buildah_from_p;
    container_id = container_id.trim();
    console.log(`Have working container: ${container_id}`);
    var container_mounted = false;
    try {
        const mount_rc = child_process.spawnSync('buildah', ['mount', container_id]);
        if (mount_rc.signal)
            throw `mount killed by signal ${mount_rc.signal}`;
        if (mount_rc.status != 0)
            throw `mount exited with failure status`;
        container_mounted = true;
        var mountpoint = mount_rc.stdout.toString().trim();
        console.log(`Container root at ${mountpoint}`);
        const hostdb = await db_1.Database.construct(path.join(mountpoint, 'var/lib/rpkg/database/'));
        console.log(hostdb);
        const tx = new transaction_1.Transaction(repo, hostdb, targetdb);
        await Promise.all(argv._.slice(1).map(async function (shortpkg) {
            const resolved = await (new atom_1.Atom(shortpkg)).resolveUsingRepository(repo);
            await tx.addToTransaction(resolved, transaction_1.Location.Target, true);
        }));
        const plan = await tx.plan();
        transaction_1.Transaction.displayPlan(plan);
        var hostinstalls = [];
        for (const step of plan) {
            if (step.type == transaction_1.StepType.Build) {
                if (hostinstalls.length) {
                    await repo.installPackages(hostinstalls, hostdb, mountpoint);
                    hostinstalls = [];
                }
                const pkgdesc = await repo.getPackageDescription(step.what);
                const build_path = path.join(repo.local_builds_path, step.what.getCategory(), step.what.getName() + "," + pkgdesc.version.version + ".tar.xz");
                if (!fs.existsSync(build_path))
                    await repo.buildPackage(step.what, container_id, mountpoint);
            }
            else if (step.type == transaction_1.StepType.HostInstall) {
                hostinstalls.push(step.what);
            }
        }
    }
    catch (e) {
        console.error(`Got error: ${e}`);
        process.exitCode = 1;
    }
    finally {
        console.log("Cleaning up...");
        if (container_mounted)
            child_process.spawnSync('buildah', ['umount', container_id], { stdio: 'inherit' });
        child_process.spawnSync('buildah', ['rm', container_id], { stdio: 'inherit' });
    }
}
async function main() {
    if (argv.repository)
        argv.repository = path.resolve(argv.repository);
    if (argv._.length > 0) {
        if (argv._[0] == 'install') {
            const repo = new repo_1.Repository(argv.repository || '/var/lib/rpkg/repo', argv.remote_url);
            const hostdb = await db_1.Database.construct((argv.host_root || '') + '/var/lib/rpkg/database/');
            const targetdb = await db_1.Database.construct((argv.target_root || '') + '/var/lib/rpkg/database/');
            const tx = new transaction_1.Transaction(repo, hostdb, targetdb);
            await Promise.all(argv._.slice(1).map(async function (shortpkg) {
                const resolved = await (new atom_1.Atom(shortpkg)).resolveUsingRepository(repo);
                await tx.addToTransaction(resolved, transaction_1.Location.Target);
            }));
            const plan = await tx.plan();
            transaction_1.Transaction.displayPlan(plan);
            for (const step of plan) {
                if (step.type == transaction_1.StepType.Build) {
                    console.log("\nThis plan would require packages to be compiled from source.");
                    process.exit(1);
                }
                else if (step.type == transaction_1.StepType.TargetInstall) {
                    await repo.installPackage(step.what, targetdb, (argv.target_root || '/'));
                }
            }
            // in case hostdb == targetdb
            // TODO this needs to be *way* more formalized
            await targetdb.reload();
            argv._.slice(1).map(async function (shortpkg) {
                const resolved = await (new atom_1.Atom(shortpkg)).resolveUsingRepository(repo);
                targetdb.select(resolved);
            });
            await targetdb.commit();
        }
        else if (argv._[0] == 'build') {
            if (argv.unshared) {
                await build_packages(argv);
            }
            else {
                child_process.spawnSync('buildah', ['unshare', '--'].concat(process.argv).concat('--unshared'), { stdio: 'inherit' });
            }
        }
        else if (argv._[0] == 'update') {
            const repo = new repo_1.Repository(argv.repository || '/var/lib/rpkg/repo', argv.remote_url);
            const db = await db_1.Database.construct((argv.target_root || '') + '/var/lib/rpkg/database/');
            const manifest = await repo.maybeUpdateManifest();
            for (const pkg of manifest.getAllPackages()) {
                if (db.getInstalledVersion(pkg.atom) && pkg.version.compare(db.getInstalledVersion(pkg.atom))) {
                    console.log(`Found outdated package: ${pkg.atom.format()}`);
                }
            }
        }
        else if (argv._[0] == '_get_builds_for') {
            const repo = new repo_1.Repository(argv.repository || '/var/lib/rpkg/repo');
            const hostdb = await db_1.Database.construct((argv.host_root || '') + '/var/lib/rpkg/database/');
            const targetdb = await db_1.Database.construct((argv.target_root || '') + '/var/lib/rpkg/database/');
            const tx = new transaction_1.Transaction(repo, hostdb, targetdb);
            await Promise.all(argv._.slice(1).map(async function (shortpkg) {
                const resolved = await (new atom_1.Atom(shortpkg)).resolveUsingRepository(repo);
                await tx.addToTransaction(resolved, transaction_1.Location.Target);
            }));
            const plan = await tx.plan();
            for (const step of plan) {
                if (step.type == transaction_1.StepType.Build) {
                    console.log(step.what.format());
                }
            }
        }
    }
    else {
        print_help();
    }
}
function print_help() {
    console.log("Usage: rpkg [options] <action> [packages]");
}
try {
    main();
}
catch (e) {
    console.error(e);
    process.exitCode = 1;
}
