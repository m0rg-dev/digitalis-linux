"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repo_1 = require("./repo");
const path = require("path");
async function main() {
    var r = new repo_1.Repository(path.join(__dirname, "..", "repository"));
    await r.buildManifest();
}
main();
