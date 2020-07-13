"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repo_1 = require("./repo");
const atom_1 = require("./atom");
const child_process = require("child_process");
async function main() {
    const container = process.argv[4];
    const buildah_from = child_process.spawn('buildah', ['from', container], {
        stdio: ['pipe', 'pipe', 'inherit']
    });
    var container_id = "";
    buildah_from.stdout.on('data', (data) => container_id += data.toString('utf8'));
    const buildah_from_p = new Promise((res, rej) => {
        buildah_from.on('exit', () => res());
        buildah_from.on('error', () => rej());
    });
    var repo = new repo_1.Repository(process.argv[2]);
    var atom = await (new atom_1.Atom(process.argv[3])).resolveUsingRepository(repo);
    var pkgdesc = await repo.getPackageDescription(atom);
    console.log(pkgdesc);
    await buildah_from_p;
    container_id = container_id.trim();
    console.log(`Have working container: ${container_id}`);
    try {
        await repo.buildPackage(atom, container_id);
    }
    catch (e) {
        console.error(`Got error: ${e}`);
        process.exitCode = 1;
    }
    finally {
        console.log("Cleaning up...");
        child_process.spawnSync('buildah', ['rm', container_id], { stdio: 'inherit' });
    }
}
main();
