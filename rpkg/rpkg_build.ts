import { Repository, PackageDescription } from "./repo";
import { Atom, ResolvedAtom } from "./atom";
import * as child_process from 'child_process';

async function main() {
    const container: string = process.argv[4];
    const buildah_from = child_process.spawn('buildah', ['from', container], {
        stdio: ['pipe', 'pipe', 'inherit']
    });
    var container_id: string = "";
    buildah_from.stdout.on('data', (data) => container_id += data.toString('utf8'));

    const buildah_from_p = new Promise((res, rej) => {
        buildah_from.on('exit', () => res());
        buildah_from.on('error', () => rej());
    });

    var repo: Repository = new Repository(process.argv[2]);
    var atom: ResolvedAtom = await (new Atom(process.argv[3])).resolveUsingRepository(repo);
    var pkgdesc: PackageDescription = await repo.getPackageDescription(atom);
    console.log(pkgdesc);
    await buildah_from_p;
    container_id = container_id.trim();
    console.log(`Have working container: ${container_id}`);
    try {
        await repo.buildPackage(atom, container_id);
    } catch (e) {
        console.error(`Got error: ${e}`);
        process.exitCode = 1;
    } finally {
        console.log("Cleaning up...");
        child_process.spawnSync('buildah', ['rm', container_id], { stdio: 'inherit' });
    }
}


main();
