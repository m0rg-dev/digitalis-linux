import * as minimist from 'minimist';
import { Config } from './Config';
import { Repository } from './Repository';
import { Database } from './Database';
import { Transaction, Location, StepType } from './Transaction';
import * as child_process from 'child_process';
import * as path from 'path';
import * as byteSize from 'byte-size';
import { Commands } from './Commands';
import { AtomUtils } from './Atom';

byteSize.defaultOptions({
    units: 'iec'
});

const argv = minimist(process.argv.slice(2), {
    string: ["host_root", "target_root", "repository", "build_container", "remote_url"],
    boolean: ["without_default_depends", "skip_confirm", "unshared", "without_hostdb", "verbose"]
});

Config.use_default_depends = !argv.without_default_depends;
Config.without_hostdb = argv.without_hostdb;
Config.verbose_output = argv.verbose;

if (argv.build_container) Config.build_container = argv.build_container;
if (argv.repository) Config.repository = argv.repository;

function ensure_unshared(argv: any, callback: Function) {
    if (argv.unshared) {
        return callback(argv);
    } else {
        const rc = child_process.spawnSync('buildah', ['unshare', '--'].concat(process.argv).concat('--unshared'), { stdio: 'inherit' });
        process.exitCode = rc.status;
    }
}

async function main() {
    if (argv.repository) argv.repository = path.resolve(argv.repository);

    if (argv._.length > 0) {
        if (argv._[0] == 'install') {
            const repo = new Repository(argv.repository || '/var/lib/x10/repo', argv.remote_url);
            const targetdb = Database.construct((argv.target_root || '') + '/var/lib/x10/database/');
            const to_install = await Promise.all(argv._.slice(1).map(async (shortpkg) => await AtomUtils.resolveUsingRepository(shortpkg, repo)));

            await Commands.installPackages(new Set(to_install),
                repo, targetdb, argv.target_root || '/');

            targetdb.print_stats();
        } else if (argv._[0] == 'build') {
            ensure_unshared(argv, async () => {
                let success = await Commands.buildPackages(argv._.slice(1));
                if (!success) process.exitCode = 1;
            });
        } else if (argv._[0] == '_build_single') {
            ensure_unshared(argv, async () => {
                const repo = new Repository(Config.repository);
                const success = await Commands.buildSingle(await AtomUtils.resolveUsingRepository(argv._[1], repo),
                    new Set(await Promise.all(argv._.slice(2).map((p) => AtomUtils.resolveUsingRepository(p, repo)))));
                if (!success) process.exitCode = 1;
            })
        } else if (argv._[0] == 'update') {
            const repo = new Repository(argv.repository || '/var/lib/x10/repo', argv.remote_url);
            const db = Database.construct((argv.target_root || '') + '/var/lib/x10/database/');

            const manifest = await repo.maybeUpdateManifest();
            for (const pkg of manifest.getAllPackages()) {
                if (db.getInstalledVersion(pkg.atom) && pkg.version.compare(db.getInstalledVersion(pkg.atom))) {
                    console.log(`Found outdated package: ${pkg.atom}`);
                }
            }

        }
    } else {
        print_help();
    }
}

function print_help() {
    console.log("Usage: x10 [options] <action> [packages]");
}

try {
    main();
} catch (e) {
    console.error(e);
    process.exitCode = 1;
}