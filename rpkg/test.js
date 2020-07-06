"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_js_1 = require("./atom.js");
const repo_js_1 = require("./repo.js");
const transaction_js_1 = require("./transaction.js");
const config_js_1 = require("./config.js");
const db_js_1 = require("./db.js");
config_js_1.Config.setConfigKey('use_default_depends', false);
async function main() {
    const a = new atom_js_1.Atom("base-system");
    const repo = new repo_js_1.Repository("/tmp/repository", new URL("https://x.internal.m0rg.dev:10443/repository/"));
    const resolved = await a.resolveUsingRepository(repo);
    const hostdb = await db_js_1.Database.construct("/tmp/hostdb");
    const targetdb = await db_js_1.Database.construct("/tmp/targetdb");
    const tx = new transaction_js_1.Transaction(repo, hostdb, targetdb);
    await tx.addToTransaction(resolved, transaction_js_1.Location.Target);
    console.log(tx);
    const plan = await tx.plan();
    transaction_js_1.Transaction.displayPlan(plan);
}
main();
