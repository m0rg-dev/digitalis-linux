import { Repository } from "./Repository";
import { PackageDescription } from "./PackageDescription";
import { Atom, old_Atom } from "./Atom";
import * as path from 'path';
import * as child_process from 'child_process';
import { Database } from "./Database";

async function main() {
    var repo: Repository = new Repository("/var/lib/x10/repo/");
    var atom: Atom = await (new old_Atom(process.argv[2])).resolveUsingRepository(repo);
    //var pkgdesc: PackageDescription = await repo.getPackageDescription(atom);
    var target_root: string = process.argv[3] || '/';
    var db: Database = await Database.construct(path.join(target_root, "var/lib/x10/database/"));

    repo.installPackage(atom, db, target_root);
    /*

    const build_path = path.join("/var/lib/x10/repo/builds/", atom.getCategory(), atom.getName() + "," + pkgdesc.version.version + ".tar.xz");
    const rc = child_process.spawnSync('tar', ['xpJf', build_path], {
        cwd: target_root,
        stdio: 'inherit'
    });
    if(rc.signal) throw `unpack killed by signal ${rc.signal}`;
    if(rc.status != 0) throw `unpack exited with failure status`;
    // TODO this shouldn't go here
    if(pkgdesc.queue_hooks['ldconfig']) {
        console.log("Running ldconfig...");
        child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
    }
    db.install(atom, pkgdesc.version);
    await db.commit();
    */
}

try {
    main();
} catch (e) {
    console.error(`Got error: ${e}`);
    process.exitCode = 1;
}