import * as glob from 'glob';
import * as util from 'util';
import * as child_process from 'child_process';
import fs = require('fs');
import path = require('path');
import { Logger } from './Logger';
import { Config } from './Config';

export type evr = string;
export type n_evr = string;
export type dist_name = string;
export type package_name = string;
export type file_name = string;
export type spec_file_name = string;
export type rpm_profile = string;

export type spec_with_options = {
    spec: spec_file_name,
    profile: rpm_profile
}

export class PackageNotFoundError extends Error {   
}

const debug_rpmdb_build = false;

export class RPMDatabase {
    static provider_db: Map<n_evr, spec_with_options> = new Map();
    static dist_name_to_version: Map<dist_name, Map<package_name, evr>> = new Map();
    static dist_file_to_spec: Map<dist_name, Map<file_name, spec_with_options>> = new Map();

    static async rebuild() {
        Logger.info('Loading RPM database...');
        const specs = await util.promisify(glob)('../rpmbuild/SPECS/*.spec');
        await Promise.all(specs.map(async spec => {
            if(debug_rpmdb_build) Logger.debug(`Processing: ${spec}`);
            for (const profile in Config.get().rpm_profiles) {
                const optset = Config.get().rpm_profiles[profile].options;
                const output = await RPMDatabase.getSpecProvides(spec, optset);
                if(debug_rpmdb_build) Logger.debug(output);
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
        }));
        Logger.info('RPM database loaded.');
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

    private static specRequireCache = new Map<string, string>();

    static async getSpecRequires(spec: spec_file_name, optset: string[], type = 'requires'): Promise<string[]> {
        const cache_key = `${spec}-${optset.join(',')}-${type}`;
        let output: string;
        if (RPMDatabase.specRequireCache.has(cache_key)) {
            output = RPMDatabase.specRequireCache.get(cache_key);
        } else {
            if(debug_rpmdb_build) Logger.debug(`getSpecRequires cache miss ${cache_key}`);
            const args = ['-q', '--' + type, '--macros', 'digitalis.rpm-macros', spec, ...optset];
            if(debug_rpmdb_build) Logger.debug(`rpmspec ${args.join(" ")}`);
            const proc = child_process.spawn('rpmspec', args);
            const stdout: Buffer[] = [];
            proc.stdout.on('data', (data) => {
                stdout.push(data);
            });
            proc.stderr.on('data', (data) => {
                Logger.debug(`${spec} ${data.toString()}`);
            });
            output = await new Promise<string>((resolve, reject) => {
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
            RPMDatabase.specRequireCache.set(cache_key, output);
        }
        const ret = output.split("\n").filter(s => s.length > 0);
        if(debug_rpmdb_build) Logger.debug(`${type} of ${spec}: ${ret.join("\n")}`);
        return ret;
    }

    private static packageRequireCache = new Map<string, string>();

    static async getPackageRequires(what: package_name, profile: rpm_profile): Promise<string[]> {
        // [ TODO 
        const spec = RPMDatabase.getSpecFromName(what, Config.get().rpm_profiles[profile].dist || profile);
        const optset = Config.get().rpm_profiles[spec.profile].options;
        // TODO ]
        const cache_key = `${what}-${profile}`;
        let output: string;
        if (RPMDatabase.packageRequireCache.has(cache_key)) {
            output = RPMDatabase.packageRequireCache.get(cache_key);
        } else {
            if(debug_rpmdb_build) Logger.debug(`getPackageRequires cache miss ${cache_key}`);
            const args = ['-q', '--queryformat', '[%{provides} ];[%{requires} ]\\n', '--macros', 'digitalis.rpm-macros', spec.spec, ...optset];
            if(debug_rpmdb_build) Logger.debug(`rpmspec ${args.join(" ")}`);
            const proc = child_process.spawn('rpmspec', args);
            const stdout: Buffer[] = [];
            proc.stdout.on('data', (data) => {
                stdout.push(data);
            });
            proc.stderr.on('data', (data) => {
                Logger.debug(`${spec.spec} ${data.toString()}`);
            });
            output = await new Promise<string>((resolve, reject) => {
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
            RPMDatabase.packageRequireCache.set(cache_key, output);
        }
        const subpackages = output.split("\n").filter(s => s.length > 0);
        for (const subpackage of subpackages) {
            const names = subpackage.split(/;/)[0].split(/\s+/).filter(s => s.length > 0);
            const reqs = subpackage.split(/;/)[1].split(/\s+/).filter(s => s.length > 0);
            for (const name of names) {
                if (name === what.split(/\s*=\s*/)[0]) {
                    return reqs;
                }
            }
        }
        if(debug_rpmdb_build) Logger.debug(`Couldn't find ${what} in ${spec.spec}!`);
        return await RPMDatabase.getSpecRequires(spec.spec, optset);
    }

    static getSpecFromName(what: package_name, dist: dist_name): spec_with_options {
        if (what.startsWith('/')) {
            // This is a file-like dependency.
            const found = RPMDatabase.dist_file_to_spec.get(dist).get(what);
            if (found) {
                return found;
            } else {
                throw new PackageNotFoundError(`Can't find ${what} in ${dist}.`);
            }
        } else {
            let [name, evr] = what.split(/\s*=\s*/);
            if (!evr) {
                evr = RPMDatabase.dist_name_to_version.get(dist).get(name) + '.' + dist;
                if (!evr) {
                    throw new PackageNotFoundError(`Can't find ${what} in ${dist}.`);
                }
            }
            const found = RPMDatabase.provider_db.get(`${name} = ${evr}`);
            if (found) {
                return found;
            } else {
                throw new PackageNotFoundError(`Can't find ${what} in ${dist}.`);
            }
        }
    }

    static async haveArtifacts(what: spec_file_name, where: rpm_profile): Promise<boolean> {
        const optset = Config.get().rpm_profiles[where].options;
        const proc = child_process.spawn('rpmspec', ['-q', '--rpms', '--macros', 'digitalis.rpm-macros', what, ...optset]);
        const stdout: Buffer[] = [];
        proc.stdout.on('data', (data) => {
            stdout.push(data);
        });
        proc.stderr.on('data', (data) => {
            Logger.debug(`${what} ${data.toString()}`);
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
        for(const line of output.split('\n').filter(s => s.length > 0)) {
            const parts = line.split('.');
            const arch = parts.pop();
            if(!fs.existsSync(path.join('../rpmbuild/RPMS/', arch, `${line}.rpm`))) return false;
        }
        return true;
    }
}