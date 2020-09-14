import { Atom, AtomUtils } from "./Atom";
import { Repository } from "./Repository";
import { PackageDescription } from "./PackageDescription";

import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as tar_stream from 'tar-stream';
import * as byteSize from 'byte-size';
import { Readable } from "stream";
import { Config } from "./Config";

export class BuildContext {
    private container_id: string;
    private container_mountpoint: string;
    private bind_mounts: Map<string, string>;

    constructor(container_id: string, container_mountpoint: string) {
        this.container_id = container_id;
        this.container_mountpoint = container_mountpoint;
        this.bind_mounts = new Map();
    }

    private runInContainerContext(name: string, command: string, args: string[], save_stdout = false, stdin?: Readable | Buffer): Promise<Buffer> {
        console.warn(`[container] starting ${name}`);
        var real_args = ['--net=host', 'run'];
        this.bind_mounts.forEach((value, key) => {
            real_args.push(`--mount=type=bind,source=${key},destination=${value}`)
        });
        Array.prototype.push.apply(real_args, [this.container_id, command, args].flat());
        return new Promise((res, rej) => {
            const proc = child_process.spawn('buildah', real_args, { stdio: ['pipe', (save_stdout || !Config.verbose_output) ? 'pipe' : 'inherit', 'inherit'] });
            if (stdin) {
                if (stdin instanceof Readable) {
                    stdin.pipe(proc.stdin);
                } else if (stdin instanceof Buffer) {
                    proc.stdin.write(stdin);
                    proc.stdin.end();
                }
            }
            var stdout_chunks: Buffer[] = [];
            proc.on('exit', (code, signal) => {
                console.warn(`[container] ${name} exited`);
                if (signal) rej(`${name} killed by signal ${signal}`);
                if (code != 0) rej(`${name} exited with failure status`);
                if (save_stdout) {
                    res(Buffer.concat(stdout_chunks));
                } else {
                    res(null);
                }
            });
            if (save_stdout || !Config.verbose_output) {
                proc.stdout.on('data', (data) => {
                    stdout_chunks.push(data);
                });
            }
        });
    }

    private runInHostContext(name: string, command: string, args: string[], save_stdout = false, stdin?: Readable | Buffer, cwd?: string): Promise<Buffer> {
        if (!cwd) cwd = this.container_mountpoint;
        console.warn(`[host] starting ${name}`);
        return new Promise((res, rej) => {
            const proc = child_process.spawn(command, args, { stdio: ['pipe', save_stdout ? 'pipe' : 'inherit', 'inherit'], cwd: cwd });
            if (stdin) {
                if (stdin instanceof Readable) {
                    stdin.pipe(proc.stdin);
                } else if (stdin instanceof Buffer) {
                    proc.stdin.write(stdin);
                    proc.stdin.end();
                }
            }
            var stdout_chunks: Buffer[] = [];
            proc.on('exit', (code, signal) => {
                console.warn(`[host] ${name} exited`);
                if (signal) rej(`${name} killed by signal ${signal}`);
                if (code != 0) rej(`${name} exited with failure status`);
                res(Buffer.concat(stdout_chunks));
            });
            if (save_stdout) {
                proc.stdout.on('data', (data) => {
                    stdout_chunks.push(data);
                });
            }
        });
    }

    private async searchLicense(atom: Atom, pkgdesc: PackageDescription, host_unpack_dir: string): Promise<string> {
        const possible_licenses = [];
        if (pkgdesc.src) {
            const findsrc = await this.runInHostContext('license_search', 'find', [host_unpack_dir, '-print0'], true);
            for (const file of findsrc.toString().split('\0')) {
                const basename = path.basename(file);
                if (/^(LICEN[SC]E(\..*)?|COPYING(.*)?|COPYRIGHT)$/.test(basename)
                    && !/_virtualenv/.test(file)) {
                    possible_licenses.push(file);
                }
            }
            console.log(`Have potential license: ${possible_licenses.join(", ")}`);
        }

        var license_text = "";
        if (pkgdesc.license) {
            license_text += `The package maintainer believes ${atom} ${pkgdesc.version.version} is available under the '${pkgdesc.license}' license.\n\n`;
        } else {
            license_text += `The package maintainer has not specified a license for ${atom} ${pkgdesc.version.version}.\n\n`;
        }

        if (possible_licenses.length) {
            license_text += "Additionally, license information was found in the package source and is reproduced below.\n\n";
            for (const file of possible_licenses) {
                const text = await fs.promises.readFile(file);
                license_text += `${file}:\n${text.toString()}\n\n`;
            }
        } else if (pkgdesc.license_location.startsWith('given')) {
            license_text += "Additionally, this license information was provided in the build file:\n\n";
            license_text += pkgdesc.license_location.substr(6) + "\n";
        } else {
            license_text += "No licensing information was found in the package source.\n\n";
        }

        if (pkgdesc.src_url) {
            license_text += `While this is intended to be an accurate representation of ${atom} ${pkgdesc.version.version}'s licensing, check the package source at ${pkgdesc.src_url} to be sure.\n`;
        }

        return license_text;
    }

    // Someday, we're going to have an Arch-like system where individual packages (glibc, fontconfig, etc) can register hooks
    // somewhere in the filesystem that get processed during this step. For now, though, we're just going to look for
    // shared libraries.
    private async runFileHooks() {
        const find = await this.runInHostContext('shlib_search', 'find', ['target_root', '-print0'], true);
        var need_ldconfig = false;
        for (const file of find.toString().split('\0')) {
            if (file.endsWith('.so')) {
                need_ldconfig = true;
            }
        }

        if (need_ldconfig) {
            await this.runInContainerContext('ldconfig', 'ldconfig', ['-N', '-r', '.']);
        }
    }

    private async modifyTarfile(atom: Atom, pkgdesc: PackageDescription, tarfile: Buffer, license_text: string): Promise<Buffer> {
        const extract = tar_stream.extract();
        const pack = tar_stream.pack();

        const file_list = [];

        extract.on('entry', function (header, stream, callback) {
            // Potential packaging issue: packages placed in /usr/etc or /usr/var
            if (header.name.startsWith('./usr/etc')) {
                console.error(`Package ${atom} ${pkgdesc.version.version} has attempted to install files to /usr/etc. This is usually the result of a under-informed build - try passing --sysconfdir=/etc to configure.`);
                throw "Aborting due to packaging issues";
            }
            if (header.name.startsWith('./usr/var')) {
                console.error(`Package ${atom} ${pkgdesc.version.version} has attempted to install files to /usr/var. This is usually the result of a under-informed build - try passing --localstatedir=/var to configure.`);
                throw "Aborting due to packaging issues";
            }

            // Potential packaging issue: pkgconfig scripts placed in /usr/lib64/pkgconfig (meson does this sometimes)
            if (header.name.startsWith('./usr/lib64/pkgconfig')) {
                console.error(`Package ${atom} ${pkgdesc.version.version} has attempted to install pkg-config data to /usr/lib64/pkgconfig. This is probably meson's fault - stick a 'mv' in the post_install_script.`);
                throw "Aborting due to packaging issues";
            }

            file_list.push({name: header.name, type: header.type});

            stream.pipe(pack.entry(header, callback));
        });

        extract.on('finish', function () {
            if (!file_list.some((f) => f.name == './usr/')) {
                pack.entry({ name: './usr/', mode: 0o755, type: 'directory' });
                file_list.push({ name: './usr/', type: 'directory' });
            }
            if (!file_list.some((f) => f.name == './usr/share/')) {
                pack.entry({ name: './usr/share/', mode: 0o755, type: 'directory' });
                file_list.push({ name: './usr/share/', type: 'directory' });
            }
            if (!file_list.some((f) => f.name == './usr/share/licenses/')) {
                pack.entry({ name: './usr/share/licenses/', mode: 0o755, type: 'directory' });
                file_list.push({ name: './usr/share/licenses/', type: 'directory' });
            }
            if (!file_list.some((f) => f.name == './usr/share/licenses/' + AtomUtils.getCategory(atom))) {
                pack.entry({ name: './usr/share/licenses/' + AtomUtils.getCategory(atom), mode: 0o755, type: 'directory' });
                file_list.push({ name: './usr/share/licenses/' + AtomUtils.getCategory(atom), type: 'directory' });
            }
            pack.entry({ name: `./usr/share/licenses/${atom}` }, license_text);
            file_list.push({ name: `./usr/share/licenses/${atom}`, type: 'file' });
            file_list.push({ name: `./var/lib/x10/database/${atom}.list`, type: 'file' });
            pack.entry({ name: `./var/lib/x10/database/${atom}.list` }, JSON.stringify(file_list, null, 1));
            pack.finalize();
        });

        extract.write(tarfile);
        extract.end();

        const chunks = [];
        for await (const chunk of pack) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks);
    }

    async build(atom: Atom, pkgdesc: PackageDescription, repo: Repository) {
        const host_unpack_dir = `/tmp/x10/unpack_${atom.replace('/', '_')}`;
        const host_build_dir = `/tmp/x10/build_${atom.replace('/', '_')}`;

        try {
            const config_1 = this.runInHostContext('config_1', 'buildah', ['config', '--workingdir', '/', this.container_id]);
            const mktargetdirs = this.runInContainerContext('mktargetdirs', 'mkdir', ['/target_root']);

            const additional_sources = (pkgdesc.additional_sources || [])
                .map(async (source) => {
                    const src: Buffer = await repo.getSource(source);
                    return this.runInContainerContext(`src_${source}`, 'sh', ['-c', `cat >/${source}`], false, src);
                });

            const mkhostdirs = this.runInHostContext('mkhostdirs', 'mkdir', ['-p', host_unpack_dir, host_build_dir]);

            await Promise.all([config_1, mktargetdirs, mkhostdirs].concat(additional_sources));

            this.bind_mounts.set(host_build_dir, '/build');
            this.bind_mounts.set(host_unpack_dir, `/${pkgdesc.unpack_dir}`);

            var untar: Promise<any>;

            if (pkgdesc.src) {
                var src: Buffer = await repo.getSourceFor(pkgdesc);

                if (pkgdesc.comp.startsWith('tar')) {
                    const program_by_comp = {
                        "tar.gz": "gunzip -c",
                        "tar.bz2": "bzcat",
                        "tar.xz": "xzcat"
                    };

                    const uncomp = child_process.spawn('sh', ['-c', program_by_comp[pkgdesc.comp]]);
                    uncomp.stdin.write(src);
                    uncomp.stdin.end();

                    untar = this.runInHostContext('untar', 'tar', ['x', '--no-same-owner', '--strip-components=1'], false, uncomp.stdout, host_unpack_dir);
                } else {
                    untar = this.runInContainerContext('src', 'sh', ['-c', `cat >/${pkgdesc.src}`], false, src);
                }
            }

            var config_2: Promise<any>;
            if (pkgdesc.use_build_dir) {
                config_2 = this.runInHostContext('config_2', 'buildah', ['config', '--workingdir', '/build', this.container_id]);
            } else {
                config_2 = this.runInHostContext('config_2', 'buildah', ['config', '--workingdir', path.join("/", pkgdesc.unpack_dir), this.container_id]);
            }

            await Promise.all([untar, config_2]);
            const license = this.searchLicense(atom, pkgdesc, host_unpack_dir);

            if (pkgdesc.pre_configure_script) await this.runInContainerContext('pre_configure_script', 'sh', ['-exc', pkgdesc.pre_configure_script]);
            if (pkgdesc.configure) await this.runInContainerContext('configure', 'sh', ['-exc', pkgdesc.configure]);
            if (pkgdesc.make) await this.runInContainerContext('make', 'sh', ['-exc', pkgdesc.make]);
            if (pkgdesc.install) await this.runInContainerContext('install', 'sh', ['-exc', pkgdesc.install]);

            await this.runInHostContext('config_3', 'buildah', ['config', '--workingdir', '/target_root', this.container_id]);
            if (pkgdesc.post_install_script) await this.runInContainerContext('post_install_script', 'sh', ['-exc', pkgdesc.post_install_script]);
            await this.runFileHooks();

            var tarfile = await this.runInContainerContext('tar', 'tar', ['cp', '.'], true);
            const license_text = await license;
            tarfile = await this.modifyTarfile(atom, pkgdesc, tarfile, license_text);

            const xzfile = await this.runInHostContext('compress', 'xz', ['-T0', '-c'], true, tarfile);
            console.log(`  Compressed package is ${byteSize(xzfile.length)}.`);
            const target_path = path.join(repo.local_builds_path, atom + "," + pkgdesc.version.version + ".tar.xz");
            console.log(`Writing to ${target_path}...`);
            try {
                await fs.promises.stat(path.dirname(target_path));
            } catch {
                await fs.promises.mkdir(path.dirname(target_path), { recursive: true });
            }

            await fs.promises.writeFile(target_path, xzfile);
        } finally {
            await this.runInHostContext('config_1', 'buildah', ['config', '--workingdir', '/', this.container_id]);
            await this.runInContainerContext('cleanup_container', 'rm', ['-rf', '/target_root']);
            await this.runInHostContext('cleanup', 'rm', ['-rf', host_unpack_dir, host_build_dir]);
        }
    }
}