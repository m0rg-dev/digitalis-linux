"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repo_1 = require("./repo");
const atom_1 = require("./atom");
const child_process = require("child_process");
const path = require("path");
const fs = require("fs");
async function main() {
    const container = process.argv[4];
    const target_dir = process.argv[5] || path.join(process.argv[2], "builds");
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
        child_process.spawnSync('buildah', ['run', container_id, 'mkdir', '/target_root', '/build'], { stdio: 'inherit' });
        if (pkgdesc.src) {
            var src = await repo.getSourceFor(pkgdesc);
            console.log(src.length);
            console.log("Unpacking...");
            const tar_args_by_comp = {
                "tar.gz": "xz",
                "tar.bz2": "xj",
                "tar.xz": "xJ"
            };
            child_process.spawnSync('buildah', ['run', container_id, 'tar', tar_args_by_comp[pkgdesc.comp]], {
                input: src,
            });
        }
        if (pkgdesc.use_build_dir) {
            child_process.spawnSync('buildah', ['config', '--workingdir', '/build', container_id], { stdio: 'inherit' });
        }
        else {
            child_process.spawnSync('buildah', ['config', '--workingdir', path.join("/", pkgdesc.unpack_dir), container_id], { stdio: 'inherit' });
        }
        if (pkgdesc.pre_configure_script)
            run_build_stage(container_id, "pre-configure script", pkgdesc.pre_configure_script);
        if (pkgdesc.configure)
            run_build_stage(container_id, "configure", pkgdesc.configure);
        if (pkgdesc.make)
            run_build_stage(container_id, "make", pkgdesc.make);
        if (pkgdesc.install)
            run_build_stage(container_id, "make install", pkgdesc.install);
        child_process.spawnSync('buildah', ['config', '--workingdir', '/target_root', container_id]);
        if (pkgdesc.post_install_script)
            run_build_stage(container_id, "post-install script", pkgdesc.post_install_script);
        // TODO autodetect
        if (pkgdesc.queue_hooks['ldconfig'])
            run_build_stage(container_id, "ldconfig", "ldconfig -N -r .");
        console.log("Compressing...");
        // TODO these should pipe to each other but I'm lazy
        const tar = child_process.spawnSync('buildah', ['run', container_id, 'tar', 'cp', '.'], {
            maxBuffer: 512 * 1024 * 1024 * 1024 // 512 MB
        });
        if (tar.signal)
            throw `tar killed by signal ${tar.signal}`;
        if (tar.status != 0)
            throw "tar exited with failure status!";
        console.log(`  Package is ${tar.stdout.length} bytes.`);
        const xz = child_process.spawnSync('xz', ['-T0', '-c'], {
            input: tar.stdout,
            maxBuffer: 512 * 1024 * 1024 * 1024 // 512 MB
        });
        console.log(`  Compressed package is ${xz.stdout.length} bytes.`);
        const target_path = path.join(target_dir, atom.getCategory(), atom.getName() + "," + pkgdesc.version.version + ".tar.xz");
        console.log(`Writing to ${target_path}...`);
        if (!fs.existsSync(path.dirname(target_path)))
            fs.mkdirSync(path.dirname(target_path), { recursive: true });
        fs.writeFileSync(target_path, xz.stdout);
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
function run_build_stage(container_id, name, script) {
    console.log(`Running ${name}...`);
    const rc = child_process.spawnSync('buildah', ['run', container_id, 'sh', '-ec', script], { stdio: 'inherit' });
    if (rc.signal)
        throw `${name} killed by signal ${rc.signal}`;
    if (rc.status != 0)
        throw `${name} exited with failure status!`;
}
main();
