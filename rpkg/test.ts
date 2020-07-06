import { Atom } from "./atom.js";
import { Repository } from "./repo.js";
import { Transaction, Location } from "./transaction.js";
import { Config } from "./config.js";
import { Database } from "./db.js";

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