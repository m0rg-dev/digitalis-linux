import { PackageCategory, PackageName, ResolvedAtom } from "./Atom.js";
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as child_process from 'child_process';
import { URL } from "url";
import { old_Manifest, ManifestPackage, Manifest } from "./Manifest";
import { Database } from "./Database.js";
import { BuildContext } from "./BuildContext.js";
import { PackageDescription } from "./PackageDescription";
import * as glob from 'glob';

export class Repository {
    local_packages_path: string;
    local_builds_path: string;
    root_path: string;
    private remote_url: URL;
    private manifest_fetched_already: boolean;

    constructor(root_path: string, remote_url?: URL) {
        this.local_packages_path = path.join(root_path, "packages");
        this.local_builds_path = path.join(root_path, "builds");
        this.root_path = root_path;
        this.remote_url = remote_url;
        this.manifest_fetched_already = false;
    }

    async getAllCategories(local?: boolean): Promise<PackageCategory[]> {
        if (local) {
            return new Promise<PackageCategory[]>((res, rej) => {
                fs.readdir(this.local_packages_path, { withFileTypes: true }, function (err, files) {
                    if (err) {
                        rej(err);
                    } else {
                        res(files.filter(file => file.isDirectory()).map(file => file.name));
                    }
                });
            });
        } else {
            return this.maybeUpdateManifest()
                .then((manifest) => {
                    return manifest.getCategories();
                });
        }
    }

    async getAllNames(c: PackageCategory, local?: boolean): Promise<PackageName[]> {
        if (local) {
            return new Promise<PackageName[]>((res, rej) => {
                fs.readdir(path.join(this.local_packages_path, c), function (err, files) {
                    if (err) {
                        rej(err);
                    } else {
                        res(Array.from((new Set(files.map(file => file.split('.yml')[0])).values())));
                    }
                });
            });
        } else {
            const manifest = await this.maybeUpdateManifest()
            return Promise.resolve(manifest.getAllPackages()
                .filter((pkg) => pkg.atom.getCategory() == c)
                .map((pkg) => pkg.atom.getName()));
        }
    }

    async readPackageDescriptionFromFilesystem(atom: ResolvedAtom): Promise<PackageDescription> {
        const package_path = path.join(this.local_packages_path, atom.getCategory(), atom.getName() + ".yml");
        let maybe_package: PackageDescription | null;
        try {
            const raw_yml = await fs.promises.readFile(package_path);
            maybe_package = new PackageDescription(raw_yml.toString('utf8'));
        } catch (err) {
            // TODO better error handling rather than "error = doesn't exist"
        }
        return maybe_package;
    }

    async getPackageDescription(atom: ResolvedAtom): Promise<PackageDescription> {
        const self = this;
        const manifest = await self.maybeUpdateManifest();
        const pkg = manifest.getPackage(atom);
        if (!pkg) {
            //throw `Couldn't find ${atom.format()} in Manifest.yml!`;
        }

        let maybe_package = await this.readPackageDescriptionFromFilesystem(atom);

        if (maybe_package) return maybe_package;

        if (self.remote_url) {
            return new Promise<PackageDescription>((resolve, reject) => {
                console.log(`Retrieving ${atom.format()} from remote server...`);
                ((self.remote_url.protocol == 'https') ? https : http).get(new URL(`packages/${atom.getCategory()}/${atom.getName()}.yml`, self.remote_url), (response) => {
                    if (response.statusCode == 200) {
                        var raw_yml: string = "";
                        response.on('data', (data) => {
                            raw_yml += data.toString('utf8');
                        });
                        response.on('end', async () => {
                            const package_path = path.join(this.local_packages_path, atom.getCategory(), atom.getName() + ".yml");
                            await fs.promises.mkdir(path.dirname(package_path), { recursive: true });
                            await fs.promises.writeFile(package_path, raw_yml);
                            resolve(new PackageDescription(raw_yml));
                        });
                    } else {
                        reject(`Got ${response.statusCode} from repo while looking for ${atom.format()}`);
                    }
                });
            });
        } else {
            throw `Have outdated or missing local ${atom.format()} and no remotes defined`;
        }
    }

    // TODO this is in desperate need of refactoring
    async maybeUpdateManifest(): Promise<old_Manifest> {
        const self = this;
        const manifest_path = path.join(self.root_path, "Manifest.yml");
        return fs.promises.access(manifest_path, fs.constants.R_OK)
            .then(async (ok) => {
                return fs.promises.readFile(manifest_path).then((data) => {
                    const manifest = old_Manifest.deserialize(data.toString('utf8'));
                    if (self.remote_url && !self.manifest_fetched_already) {
                        return undefined;
                    }
                    return manifest;
                })
            }, async (err) => undefined)
            .then(async (maybe_manifest) => {
                if (maybe_manifest) return maybe_manifest;
                if (self.remote_url) {
                    return new Promise<old_Manifest>((resolve, reject) => {
                        console.log("Retrieving Manifest.yml from remote server...");

                        ((self.remote_url.protocol == 'https') ? https : http).get(new URL('Manifest.yml', self.remote_url), (response) => {
                            if (response.statusCode == 200) {
                                var raw_yml: string = "";
                                response.on('data', (data) => {
                                    raw_yml += data.toString('utf8');
                                });
                                response.on('end', async () => {
                                    await fs.promises.writeFile(manifest_path, raw_yml)
                                    self.manifest_fetched_already = true;
                                    resolve(old_Manifest.deserialize(raw_yml));
                                });
                            } else {
                                reject(`Got ${response.statusCode} from repo while looking for Manifest.yml!`);
                            }
                        });
                    });
                } else {
                    throw `Don't have local manifest and no remotes defined (${self.root_path})`;
                }
            });
    }

    async buildExists(atom: ResolvedAtom): Promise<boolean> {
        // Should probably think about doing this in a cleaner way someday...
        if(atom.getCategory() == 'virtual') return true;
        const desc = await this.getPackageDescription(atom);
        const build_path = path.join(this.local_builds_path, atom.getCategory(), `${atom.getName()},${desc.version.version}.tar.xz`);
        return fs.existsSync(build_path);
    }

    async buildManifest() {
        let manifest = new Manifest();
        try {
            await fs.promises.stat('keys.json')
            let keys = JSON.parse((await fs.promises.readFile('keys.json')).toString());
            manifest.registerPrivateKey(keys.privateKey);
        } catch (e) {
            console.warn("Don't have private keys - this will generate a non-signed manifest.");
        }
        glob(`${this.root_path}/packages/**/*`, async (err, matches) => {
            if (err) throw err;

            let atoms: ResolvedAtom[] = [];

            await Promise.all(matches.map(async (file) => {
                let stat = await fs.promises.stat(file);
                if (stat.isFile() && path.basename(file) != 'Manifest.yml') {
                    let description_data = await fs.promises.readFile(file);
                    manifest.addFile(path.relative(this.root_path, file), description_data);

                    let m = file.match(/([a-z0-9-]+)\/([a-z0-9-]+)\.yml$/);
                    if (m[1] != 'virtual') {
                        let atom = new ResolvedAtom(m[1], m[2]);
                        let desc = new PackageDescription(description_data.toString());

                        atoms.push(atom);

                        try {
                            let build_path = path.join(this.root_path, 'builds', atom.getCategory(), atom.getName() + ',' + desc.version.version + '.tar.xz');
                            await fs.promises.stat(build_path);
                            let build_data = await fs.promises.readFile(build_path);
                            manifest.addFile(path.relative(this.root_path, build_path), build_data,);
                        } catch (e) {
                            console.warn(`Don't have a build for ${atom.format()} ${desc.version.version}.`);
                        }
                    }

                    console.log(`${file} ${m[1]} ${m[2]}`);
                }
            }));

            manifest.addBlob('package_list', Buffer.from(JSON.stringify(atoms.map(atom => atom.format()))));

            await fs.promises.writeFile(path.join(this.root_path, 'Manifest.yml'), manifest.serialize());
        });
    }

    async old_buildManifest(): Promise<void> {
        const self = this;
        var manifest = new old_Manifest();
        const categories = await self.getAllCategories(true);
        const structured_names = await Promise.all(categories.map(async function (category) {
            return self.getAllNames(category, true).then(names => names.map(name => [category, name]))
        }));
        const all_names = structured_names.flat(1);
        const all_packages = await Promise.all(all_names.map(async (name) => {
            const atom = new ResolvedAtom(name[0], name[1]);
            const raw_data = await fs.promises.readFile(path.join(self.local_packages_path, name[0], name[1] + ".yml"));
            const desc = new PackageDescription(raw_data.toString('utf8'));
            return new ManifestPackage(atom, desc.version, path.join(name[0], name[1] + ".yml"), raw_data);
        }));
        all_packages.forEach((pkg) => manifest.addPackage(pkg));
        await Promise.all(all_packages.map(async (pkg) => {
            try {
                const data = await fs.promises.readFile(path.join(self.local_builds_path, pkg.atom.getCategory(), pkg.atom.getName() + "," + pkg.version.version + ".tar.xz"));
                const build = new ManifestPackage(pkg.atom, pkg.version, path.join(self.local_builds_path, pkg.atom.getCategory(), pkg.atom.getName() + "," + pkg.version.version + ".tar.xz"), data);
                manifest.addBuild(build);
            } catch (e) {
                // if we can't read the build it doesn't exist - this can happen
            }
        }));
        return fs.promises.writeFile(path.join(self.root_path, "Manifest.yml"), manifest.serialize());
    }

    async getSource(source: string, source_url?: string): Promise<Buffer> {
        if (fs.existsSync(path.join(this.root_path, "sources", source))) {
            console.log(`Source ${path.join(this.root_path, "sources", source)} is available locally.`);
            return fs.promises.readFile(path.join(this.root_path, "sources", source));
        } else {
            if (source_url) {
                console.warn(`Source ${source} is not available locally. Fetching with wget...`);
                const wget = child_process.spawn('wget', [source_url, '-O', path.join(this.root_path, 'sources', source)], { stdio: 'inherit' });
                await new Promise((res, rej) => {
                    wget.on('exit', (code, signal) => {
                        if (signal) rej(`wget killed by signal ${signal}`);
                        if (code != 0) rej(`wget exited with failure status`);
                        res();
                    });
                })
                return fs.promises.readFile(path.join(this.root_path, "sources", source));
            } else {
                throw `Source ${source} is not available locally and no upstream URL was given`;
            }
        }
    }

    async getSourceFor(pkg: PackageDescription): Promise<Buffer> {
        //const manifest = await this.maybeUpdateManifest();
        //const src = manifest.getSource(pkg.src);
        return this.getSource(pkg.src, pkg.src_url);
    }

    static run_build_stage(container_id: string, name: string, script: string, bindmount: string, bindtarget: string) {
        console.log(`Running ${name}...`);
        var args: string[];
        if (bindmount) {
            args = ['run', `--mount=type=bind,source=${bindmount},destination=${bindtarget}`, container_id, 'sh', '-exc', script]
        } else {
            args = ['run', container_id, 'sh', '-exc', script];
        }
        const rc = child_process.spawnSync('buildah', args, { stdio: 'inherit' });
        if (rc.signal) throw `${name} killed by signal ${rc.signal}`;
        if (rc.status != 0) throw `${name} exited with failure status!`;
    }

    async buildPackage(atom: ResolvedAtom, container_id: string, container_mountpoint: string) {
        const pkgdesc: PackageDescription = await this.getPackageDescription(atom);
        const ctx = new BuildContext(container_id, container_mountpoint);
        await ctx.build(atom, pkgdesc, this);
    }

    async installPackage(atom: ResolvedAtom, db: Database, target_root: string) {
        return this.installPackages(new Set([atom]), db, target_root);
    }

    async installPackages(atoms: Set<ResolvedAtom>, db: Database, target_root: string) {
        const scratch_atoms = new Set(Array.from(atoms.values()).map(a => a.format()));
        const ordered_atoms: ResolvedAtom[] = [];
        let descs: Map<string, PackageDescription> = new Map();

        while(scratch_atoms.size) {
            for (const str of scratch_atoms.values()) {
                const atom = new ResolvedAtom(str);
                let desc = descs.get(str);
                if (!desc) descs.set(str, desc = await this.getPackageDescription(atom));

                if(desc.rdepend.every((a) => !scratch_atoms.has(a.format()))) {
                    ordered_atoms.push(atom);
                    scratch_atoms.delete(str);
                }
            }
        }

        var need_ldconfig = false;
        for (const atom of ordered_atoms) {
            const pkgdesc: PackageDescription = await this.getPackageDescription(atom);
            console.log(`Installing ${atom.format()} ${pkgdesc.version.version} to ${target_root}`);
            db.install_pending(atom);
            if (atom.getCategory() != 'virtual') {
                const build_path = await fs.promises.realpath(path.join(this.local_builds_path, atom.getCategory(), atom.getName() + "," + pkgdesc.version.version + ".tar.xz"));

                const flist_rc = child_process.spawnSync('tar', ['xJf', build_path, `./var/lib/x10/database/${atom.getCategory()}/${atom.getName()}.list`, '-O'],
                    { maxBuffer: 16 * 1024 * 1024 });
                const file_list = JSON.parse(flist_rc.stdout.toString());

                // running this in a transaction makes me feel real cool about it
                // (come back to this!)
                db.transaction(() => {
                    for (const file of file_list) {
                        db.add_file(atom, file.name, file.type);
                    }
                });

                const rc = child_process.spawnSync('tar', ['xpJvf', build_path], {
                    cwd: target_root,
                    stdio: ['ignore', 'pipe', 'inherit']
                });
                if (rc.signal) throw `unpack killed by signal ${rc.signal}`;
                if (rc.status != 0) throw `unpack exited with failure status`;

                // begin file-based hooks

                for (const file of rc.stdout.toString().split('\n')) {
                    if (file.endsWith('.so')) {
                        need_ldconfig = true;
                    }
                }

                // end file-based hooks
            }
            if (pkgdesc.post_unpack_script) {
                // in case the post-unpack script needs it
                if (need_ldconfig) {
                    console.log("Running ldconfig...");
                    child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
                    need_ldconfig = false;
                }
                console.log(`Running post-unpack script for ${atom.format()}`);
                child_process.spawnSync('chroot', ['.', 'bash', '-c', pkgdesc.post_unpack_script], { stdio: 'inherit', cwd: target_root });
            }
            db.install(atom, pkgdesc.version);
        }

        if (need_ldconfig) {
            console.log("Running ldconfig...");
            child_process.spawnSync('ldconfig', ['-X', '-r', target_root], { stdio: 'inherit' });
        }
    }
};
