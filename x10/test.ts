import { Atom } from "./Atom.js";
import { Repository } from "./Repository.js";
import { Transaction, Location } from "./Transaction.js";
import { Config } from "./Config.js";
import { Database } from "./Database.js";

Config.setConfigKey('use_default_depends', false);

async function main() {
    const a = new Atom("base-system");
    const repo = new Repository("/tmp/repository", new URL("https://x.internal.m0rg.dev:10443/repository/"));
    const resolved = await a.resolveUsingRepository(repo);
    const hostdb = await Database.construct("/tmp/hostdb");
    const targetdb = await Database.construct("/tmp/targetdb");
    const tx = new Transaction(repo, hostdb, targetdb);
    await tx.addToTransaction(resolved, Location.Target);
    console.log(tx);
    const plan = await tx.plan();
    Transaction.displayPlan(plan);
}

main();