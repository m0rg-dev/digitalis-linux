import * as minimist from 'minimist';
import { Config } from './config';
import { Repository } from './repo';
import { Database } from './db';
import { Transaction, Location, StepType } from './transaction';
import { Atom } from './atom';
import * as child_process from 'child_process';
import * as path from 'path';

const argv = minimist(process.argv.slice(2), {
    string: ["host_root", "target_root", "repository"],
    boolean: ["without_default_depends", "skip_confirm"]
});

Config.setConfigKey('use_default_depends', !argv.without_default_depends);

async function main() {
    if (argv._.length > 0) {
        if (argv._[0] == 'install') {
            const repo = new Repository(argv.repository || '/var/lib/rpkg/repo');
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
                    throw `NYI in rpkg`;
                } else if (step.type == StepType.TargetInstall) {
                    console.log(`Installing: ${step.what.format()}`);
                    child_process.spawnSync('node',
                        [path.join(__dirname, 'rpkg_install.js'), step.what.format(), (argv.target_root || '')],
                        { stdio: 'inherit' });
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