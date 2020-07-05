import { Atom } from "./atom.js";
import { Database } from "./db.js";
import { Transaction, Location } from "./transaction.js";


async function main() {
    const a = new Atom("fs-tree");
    const db = new Database("../packages");
    const resolved = await a.resolveUsingDatabase(db);
    const tx = new Transaction(db);
    await tx.addToTransaction(resolved, Location.Host);
    console.log(tx);
}

main();