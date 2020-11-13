import * as glob from 'glob';
import * as util from 'util';
import * as child_process from 'child_process';
import { Logger } from './Logger';
import { Config } from './Config';

export type evr = string;
export type n_evr = string;
export type dist_name = string;
export type package_name = string;
export type file_name = string;
export type spec_file_name = string;

export type spec_with_options = {
    spec: spec_file_name,
    profile: string
}

export class RPMDatabase {
    static provider_db: Map<n_evr, spec_with_options> = new Map();
    static dist_name_to_version: Map<dist_name, Map<package_name, evr>> = new Map();
    static dist_file_to_spec: Map<dist_name, Map<file_name, spec_with_options>> = new Map();

    static async rebuild() {
        const specs = await util.promisify(glob)('../rpmbuild/SPECS/*.spec');
        for (const spec of specs) {
            Logger.debug(`Processing: ${spec}`);
            for (const profile in Config.get().rpm_profiles) {
                const optset = Config.get().rpm_profiles[profile].options;
                const output = await RPMDatabase.getSpecProvides(spec, optset);
                Logger.debug(output);
                let found_dist: string;
                const file_like_provides: string[] = [];
                for (const line of output.split("\n")) {
                    RPMDatabase.provider_db.set(line, {
                        spec: spec,
                        profile: profile
                    });
                    const m = line.match(/^(\S*)\s*=\s*(\S*)-(.*)\.(.*)$/);
                    if (m) {
                        const name = m[1];
                        const dist = m[4];
                        if (!found_dist) {
                            found_dist = dist;
                        } else if (found_dist !== dist) {
                            throw new Error(`${spec} ${profile} has provides with different dists?`);
                        }
                        const version = m[2] + '-' + m[3];
                        if (!RPMDatabase.dist_name_to_version.has(dist))
                            RPMDatabase.dist_name_to_version.set(dist, new Map());
                        RPMDatabase.dist_name_to_version.get(dist).set(name, version);
                    } else if (line.startsWith('/')) {
                        file_like_provides.push(line);
                    }
                }
                if (found_dist) {
                    const files = await RPMDatabase.getSpecExplicitFiles(spec, optset);
                    for (const file of [...files, ...file_like_provides]) {
                        if (!RPMDatabase.dist_file_to_spec.has(found_dist)) {
                            RPMDatabase.dist_file_to_spec.set(found_dist, new Map());
                        }
                        RPMDatabase.dist_file_to_spec.get(found_dist).set(file, {
                            spec: spec,
                            profile: profile
                        });
                    }
                } else if (output.length) { // crappy bodge to avoid warning when we fail to parse entirely
                    Logger.warn(`Couldn't detect dist for ${spec} ${profile}, not building explicit file list`);
                }
            }
        }
    }

    static async getSpecProvides(spec: string, optset: string[]): Promise<string> {
        const proc = child_process.spawn('rpmspec', ['-q', '--provides', '--macros', 'digitalis.rpm-macros', spec, ...optset]);
        const stdout: Buffer[] = [];
        proc.stdout.on('data', (data) => {
            stdout.push(data);
        });
        proc.stderr.on('data', (data) => {
            Logger.debug(`${spec} ${data.toString()}`);
        });
        const output = await new Promise<string>((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal)
                    reject(`Process killed by signal ${signal}`);
                if (code > 1)
                    reject(`Process exited with code ${code}`);
                if (code)
                    resolve("");
                resolve(Buffer.concat(stdout).toString());
            });
        });
        return output;
    }

    static async getSpecExplicitFiles(spec: string, optset: string[]): Promise<string[]> {
        const proc = child_process.spawn('rpmspec', ['-P', '--macros', 'digitalis.rpm-macros', spec, ...optset]);
        const stdout: Buffer[] = [];
        proc.stdout.on('data', (data) => {
            stdout.push(data);
        });
        proc.stderr.on('data', (data) => {
            Logger.debug(`${spec} ${data.toString()}`);
        });
        const output = await new Promise<string>((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal)
                    reject(`Process killed by signal ${signal}`);
                if (code > 1)
                    reject(`Process exited with code ${code}`);
                if (code)
                    resolve("");
                resolve(Buffer.concat(stdout).toString());
            });
        });
        const files: string[] = [];
        let in_files = false;
        for (const line of output.split("\n")) {
            if (line.startsWith('%files')) {
                in_files = true;
            }
            if (line.startsWith('%changelog')) {
                in_files = false;
            }

            if (in_files && line.match(/^\/[^\*\{\?]+$/)) {
                files.push(line);
            }
        }
        return files;
    }

    static async getSpecRequires(spec: spec_file_name, optset: string[], type = 'requires'): Promise<string[]> {
        const proc = child_process.spawn('rpmspec', ['-q', '--' + type, '--macros', 'digitalis.rpm-macros', spec, ...optset]);
        const stdout: Buffer[] = [];
        proc.stdout.on('data', (data) => {
            stdout.push(data);
        });
        proc.stderr.on('data', (data) => {
            Logger.debug(`${spec} ${data.toString()}`);
        });
        const output = await new Promise<string>((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal)
                    reject(`Process killed by signal ${signal}`);
                if (code > 1)
                    reject(`Process exited with code ${code}`);
                if (code)
                    resolve("");
                resolve(Buffer.concat(stdout).toString());
            });
        });
        return output.split("\n").filter(s => s.length > 0);
    }

    static async getBuildDependencies(spec: spec_file_name, target_dist: dist_name, build_dist: dist_name): Promise<spec_with_options[]> {
        const optset = Config.get().rpm_profiles[target_dist].options;
        const reqs = await RPMDatabase.getSpecRequires(spec, optset, 'buildrequires');
        const resolved_reqs: spec_with_options[] = [];
        for (const req of reqs) {
            if (req.startsWith('/')) {
                // This is a file-like dependency.
                const found = RPMDatabase.dist_file_to_spec.get(build_dist).get(req);
                if (found) {
                    resolved_reqs.push(found);
                } else {
                    throw new Error(`Can't find ${req} in ${build_dist}.`);
                }
            } else {
                let [name, evr] = req.split(/\s*=\s*/);
                if (!evr) {
                    evr = RPMDatabase.dist_name_to_version.get(build_dist).get(name);
                    if (!evr) {
                        throw new Error(`Can't find ${req} in ${build_dist}.`);
                    }
                }
                const found = RPMDatabase.provider_db.get(req);
                if (found) {
                    resolved_reqs.push(found);
                } else {
                    throw new Error(`Can't find ${req} in ${build_dist}.`);
                }
            }
        }
        return resolved_reqs;
    }

    static async getInstallDependencies(spec: spec_file_name, target_dist: dist_name): Promise<spec_with_options[]> {
        const optset = Config.get().rpm_profiles[target_dist].options;
        const reqs = await RPMDatabase.getSpecRequires(spec, optset);
        const resolved_reqs: spec_with_options[] = [];
        for (const req of reqs) {
            if (req.startsWith('/')) {
                // This is a file-like dependency.
                const found = RPMDatabase.dist_file_to_spec.get(target_dist).get(req);
                if (found) {
                    resolved_reqs.push(found);
                } else {
                    throw new Error(`Can't find ${req} in ${target_dist}.`);
                }
            } else {
                let [name, evr] = req.split(/\s*=\s*/);
                if (!evr) {
                    evr = RPMDatabase.dist_name_to_version.get(target_dist).get(name) + '.' + target_dist;
                    if (!evr) {
                        throw new Error(`Can't find ${req} in ${target_dist}.`);
                    }
                }
                const found = RPMDatabase.provider_db.get(`${name} = ${evr}`);
                if (found) {
                    resolved_reqs.push(found);
                } else {
                    throw new Error(`Can't find ${req} in ${target_dist}.`);
                }
            }
        }
        return resolved_reqs;
    }
}