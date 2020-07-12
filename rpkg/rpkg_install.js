"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repo_1 = require("./repo");
const atom_1 = require("./atom");
const path = require("path");
const child_process = require("child_process");
const db_1 = require("./db");
async function main() {
    var repo = new repo_1.Repository("/var/lib/rpkg/repo/");
    var atom = await (new atom_1.Atom(process.argv[2])).resolveUsingRepository(repo);
    var pkgdesc = await repo.getPackageDescription(atom);
    var target_root = process.argv[3] || '/';
    var db = await db_1.Database.construct(path.join(target_root, "var/lib/rpkg/database/"));
    const build_path = path.join("/var/lib/rpkg/repo/builds/", atom.getCategory(), atom.getName() + "," + pkgdesc.version.version + ".tar.xz");
    const rc = child_process.spawnSync('tar', ['xpJf', build_path], {
        cwd: target_root,
        stdio: 'inherit'
    });
    if (rc.signal)
        throw `unpack killed by signal ${rc.signal}`;
    if (rc.status != 0)
        throw `unpack exited with failure status`;
    // TODO this shouldn't go here
    if (pkgdesc.queue_hooks['ldconfig']) {
        console.log("Running ldconfig...");
        child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
    }
    db.install(atom, pkgdesc.version);
    await db.commit();
}
main();
