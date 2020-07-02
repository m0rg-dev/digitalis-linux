import { readFileSync, mkdtempSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import child_process from 'child_process';

const main = async function () {
    const input = JSON.parse(readFileSync(0, 'utf-8'));

    const pkgdesc = input.pkgdesc;
    const rpkg_config = input.config;

    const get_host_directory = function (dir) {
        if (rpkg_config.directory_overrides[`host_${dir}`]) {
            return rpkg_config.directory_overrides[`host_${dir}`];
        }
        return path.join(rpkg_config.host_prefix, dir);
    }

    const tmpdir = mkdtempSync(path.join(os.tmpdir(), input.atom.replace(/[\/@]/g, '_')));
    console.log(`Have temporary directory: ${tmpdir}`);

    if (pkgdesc.src) {
        console.log("Unpacking...");
        if (pkgdesc.comp == 'tar.xz') {
            await run_process('unpack-src', `tar xfJ ${get_host_directory('distfiles')}/${pkgdesc.src}`, tmpdir);
        } else if (pkgdesc.comp == 'tar.gz') {
            await run_process('unpack-src', `tar xfz ${get_host_directory('distfiles')}/${pkgdesc.src}`, tmpdir);
        } else if (pkgdesc.comp == 'tar.bz2') {
            await run_process('unpack-src', `tar xfj ${get_host_directory('distfiles')}/${pkgdesc.src}`, tmpdir);
        } else {
            throw `Unknown compression ${pkgdesc.comp}`;
        }
        if(pkgdesc.additional_sources) {
            for (const src of pkgdesc.additional_sources) {
                await run_process('copy-src', `cp ${get_host_directory('distfiles')}/${src} .`, tmpdir);
            }
        }
    }

    var build_dir;

    if (pkgdesc.use_build_dir) {
        mkdirSync(path.join(tmpdir, 'build'));
        build_dir = path.join(tmpdir, 'build');
    } else {
        build_dir = path.join(tmpdir, pkgdesc.unpack_dir);
    }

    if (pkgdesc.pre_configure_script) {
        console.log("Running pre-configure script...");
        await run_process('pre-configure', pkgdesc.pre_configure_script, build_dir);
    }

    if (pkgdesc.configure) {
        console.log("Configuring...");
        await run_process('configure', pkgdesc.configure, build_dir);
    }

    if (pkgdesc.make) {
        console.log("Building...");
        await run_process('make', pkgdesc.make, build_dir);
    }

    console.log("Installing...");
    await run_process('install', pkgdesc.install, build_dir);

    if (pkgdesc.post_install_script) {
        console.log("Running post-install script...");
        await run_process('post-install', pkgdesc.post_install_script, tmpdir);
    }

    if ((existsSync(path.join(tmpdir, 'lib')) || existsSync(path.join(tmpdir, 'usr', 'lib')))
        && typeof pkgdesc.queue_hooks.ldconfig === 'undefined') {
        console.error(`${input.atom} put libraries in /lib or /usr/lib but doesn't define queue_hooks.ldconfig!`);
        process.exit(1);
    } else if (pkgdesc.queue_hooks.ldconfig) {
        await run_process('ldconfig', 'ldconfig -N -r .', tmpdir);
    }

    await run_process('cleanup', `rm -rf ${build_dir} ${pkgdesc.unpack_dir} etc/ld.so.cache`, tmpdir);
    if(pkgdesc.additional_sources) {
        for (const src of pkgdesc.additional_sources) {
            await run_process('cleanup', `rm -rf ${src}`, tmpdir);
        }
    }

    console.log("Compressing...");
    const file = `${get_host_directory('built')}/${input.atom}.tar.xz`;
    await run_process('compress', `mkdir -p $(dirname ${file}); tar cp . | xz -T 0 > ${file}`, tmpdir);
    await run_process('cleanup-2', `rm -rf ${tmpdir}`, '/');
    console.log("Done.");
}

const run_process = async function (name, cmd, dir) {
    const proc = child_process.spawn('sh', ['-exc', cmd], { cwd: dir, stdio: 'pipe' });
    proc.stdout.on('data', (data) => { console.log(`${name}: ${data}`) });
    proc.stderr.on('data', (data) => { console.log(`${name}: ${data}`) });
    const proc_p = new Promise((res, rej) => {
        proc.on('close', (rc) => {
            if (rc) rej(rc);
            res(rc);
        });
    });
    proc_p.catch((rej) => {
        console.error(`Got error in ${name}: ${rej}`);
        process.exit(1);
    })
    return proc_p;
}

main().catch((e) => {
    console.error("Caught error: " + e);
    process.exit(1);
}).then((res) => {
    process.exit(0);
});