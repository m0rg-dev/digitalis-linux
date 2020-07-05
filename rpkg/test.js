"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_js_1 = require("./atom.js");
const db_js_1 = require("./db.js");
const transaction_js_1 = require("./transaction.js");
async function main() {
    const a = new atom_js_1.Atom("fs-tree");
    const db = new db_js_1.Database("../packages");
    const resolved = await a.resolveUsingDatabase(db);
    const tx = new transaction_js_1.Transaction(db);
    await tx.addToTransaction(resolved, transaction_js_1.Location.Host);
    console.log(tx);
}
main();
