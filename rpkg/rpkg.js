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
const argv = minimist(process.argv.slice(2), {
    string: ["host_root", "target_root", "repository"],
    boolean: ["without_default_depends", "skip_confirm"]
});
config_1.Config.setConfigKey('use_default_depends', !argv.without_default_depends);
async function main() {
    if (argv._.length > 0) {
        if (argv._[0] == 'install') {
            const repo = new repo_1.Repository(argv.repository || '/var/lib/rpkg/repo');
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
                    throw `NYI in rpkg`;
                }
                else if (step.type == transaction_1.StepType.TargetInstall) {
                    console.log(`Installing: ${step.what.format()}`);
                    child_process.spawnSync('node', [path.join(__dirname, 'rpkg_install.js'), step.what.format(), (argv.target_root || '')], { stdio: 'inherit' });
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
main();
