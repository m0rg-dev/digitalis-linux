"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repo_1 = require("./repo");
async function main() {
    var r = new repo_1.Repository(process.argv[2]);
    await r.buildManifest();
}
main();
