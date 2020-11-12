import { Mutex } from "async-mutex";
import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import { BuildTarget } from "./BuildTarget";
import { Config } from "./Config";
import { Logger } from "./Logger";

export type NEVRA = {
    name: string;
    version: string;
    options: string[];
    spec: string;
    have_artifacts: boolean;
    dist: string;
    as_string: string;
}

export type RPMDependency = {
    name: string;
}

type SpecInfo = {
    file: string,
    options: string[],
    nevra?: string,
    provide?: string,
    optkey?: string
}

export class RPMDatabase {
    topdir: string;
    specs: Map<string, SpecInfo>;
    db: Map<string, Map<string, NEVRA>>;
    mtime_cache: Map<string, Date>;

    static singleton: RPMDatabase;
    static singleton_mutex: Mutex = new Mutex();
    constructor(topdir: string) {
        this.topdir = topdir;
        this.specs = new Map();
        this.db = new Map();
        this.mtime_cache = new Map();
    }

    static async get(): Promise<RPMDatabase> {
        const release = await RPMDatabase.singleton_mutex.acquire();
        if (!RPMDatabase.singleton) {
            RPMDatabase.singleton = new RPMDatabase("../rpmbuild");
            await RPMDatabase.singleton.read_specs();
        }
        release();
        return RPMDatabase.singleton;
    }

    static async get_rpm_dependencies(spec: NEVRA, type: string): Promise<RPMDependency[]> {
        const proc = child_process.spawn(
            'rpmspec', ['-q', '--' + type, spec.spec, ...spec.options], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = Buffer.alloc(0);
        return new Promise((resolve, reject) => {
            proc.stdout.on('data', (data) => {
                stdout = Buffer.concat([stdout, data]);
            });
            proc.stderr.on('data', (data) => {
                Logger.debug(`[${spec.name} stderr] ${data.toString().trim()}`);
            });
            proc.on('close', (code, signal) => {
                if (signal) reject(signal);
                if (code) reject(code);
                resolve(stdout.toString()
                    .split("\n")
                    .filter((a) => a.length > 0)
                    .map((a) => { return { name: a } }));
            });
        });
    }

    static async get_build_dependencies(spec: NEVRA, build_target: BuildTarget): Promise<RPMDependency[]> {
        const dependencies: RPMDependency[] = [];
        dependencies.push(...await RPMDatabase.get_rpm_dependencies(spec, 'buildrequires'));

        return dependencies;
    }

    static async get_install_dependencies(spec: NEVRA, build_target: BuildTarget): Promise<RPMDependency[]> {
        const dependencies: RPMDependency[] = [];
        dependencies.push(...await RPMDatabase.get_rpm_dependencies(spec, 'requires'));

        return dependencies;
    }

    async read_specs() {
        const files = await fs.promises.readdir(path.join(this.topdir, "SPECS"));
        const promises: Promise<SpecInfo[]>[] = [];
        for (const file of files) {
            if (!file.endsWith('.spec')) continue;
            const stat = await fs.promises.stat(path.join(this.topdir, "SPECS", file));
            if (this.mtime_cache.has(file) && this.mtime_cache.get(file) <= stat.mtime) continue;
            this.mtime_cache.set(file, stat.mtime);
            Logger.debug(`processing: ${file}`);
            for (const optkey in (await Config.get()).rpm_option_sets) {
                const optset = (await Config.get()).rpm_option_sets[optkey];
                promises.push(new Promise(async (resolve, reject) => {
                    const proc = child_process.spawn('rpmspec', ['-q', path.join(this.topdir, "SPECS", file), ...optset]);
                    let stdout = Buffer.alloc(0);
                    proc.stdout.on('data', (data) => {
                        stdout = Buffer.concat([stdout, data]);
                    });
                    proc.on('close', (code, signal) => {
                        if (signal) reject(`Process for ${file} killed by signal ${signal}`);
                        if (code > 1) reject(`Process for ${file} exited with code ${code}`);
                        if (code == 1) resolve([]);
                        const nevras = stdout.toString().trim().split("\n");
                        resolve(nevras.map(x => { return { file: file, options: optset, nevra: x } }));
                    })
                }));

                promises.push(new Promise(async (resolve, reject) => {
                    const proc = child_process.spawn('rpmspec', ['-q', '--provides', path.join(this.topdir, "SPECS", file), ...optset]);
                    let stdout = Buffer.alloc(0);
                    proc.stdout.on('data', (data) => {
                        stdout = Buffer.concat([stdout, data]);
                    });
                    proc.on('close', (code, signal) => {
                        if (signal) reject(`Process for ${file} killed by signal ${signal}`);
                        if (code > 1) reject(`Process for ${file} exited with code ${code}`);
                        if (code == 1) resolve([]);
                        const provides = stdout.toString().trim().split("\n");
                        resolve(provides.map(x => { return { file: file, options: optset, provide: x, optkey: optkey } }));
                    })
                }));
            }
        }
        const infos = await Promise.all(promises);

        for (const info of infos.flat()) {
            console.log(info);
            if (info.nevra) {
                const parts = info.nevra.split('-');
                const release = parts.pop();
                const version = parts.pop();
                const name = parts.join('-');

                const [relver, dist, arch] = release.split('.');

                if (!this.db.get(dist)) this.db.set(dist, new Map());
                const have_artifacts = fs.existsSync(path.join(this.topdir, 'RPMS', arch, `${name}-${version}-${relver}.${dist}.${arch}.rpm`));

                this.db.get(dist).set(name, {
                    name: name,
                    version: version + '-' + relver,
                    spec: path.join(this.topdir, "SPECS", info.file),
                    options: info.options,
                    dist: dist,
                    have_artifacts: have_artifacts,
                    as_string: info.nevra
                });
                this.db.get(dist).set(info.nevra, {
                    name: name,
                    version: version + '-' + relver,
                    spec: path.join(this.topdir, "SPECS", info.file),
                    options: info.options,
                    dist: dist,
                    have_artifacts: have_artifacts,
                    as_string: info.nevra
                });
            } else {
                if (info.provide.match(/=/)) {
                    const [provide, ver] = info.provide.split(/\s*=\s*/);
                    const [version, release] = ver.split('-');
                    if (release) {
                        const [relver, dist] = release.split('.');

                        this.db.get(dist).set(info.provide, {
                            name: provide,
                            version: version + '-' + relver,
                            spec: path.join(this.topdir, "SPECS", info.file),
                            options: info.options,
                            dist: dist,
                            have_artifacts: false,
                            as_string: info.provide
                        });

                        this.db.get(dist).set(provide, {
                            name: provide,
                            version: version + '-' + relver,
                            spec: path.join(this.topdir, "SPECS", info.file),
                            options: info.options,
                            dist: dist,
                            have_artifacts: false,
                            as_string: info.provide
                        });
                    } else {
                        Logger.warn(`${info.file} provides ${info.provide} with weird version ${ver}`);
                    }
                } else {
                    Logger.warn(`${info.file} provides unversioned ${info.provide}`);
                    if (this.db.has(info.optkey)) {
                        this.db.get(info.optkey).set(info.provide, {
                            name: info.provide,
                            version: undefined,
                            spec: path.join(this.topdir, "SPECS", info.file),
                            options: info.options,
                            dist: info.optkey,
                            have_artifacts: false,
                            as_string: info.provide
                        });
                    }
                }
            }
        }
        //console.log(this.db);
    }

    lookup_rpm(dist: string, key: string): NEVRA {
        return this.db.get(dist)?.get(key);
    }
}


