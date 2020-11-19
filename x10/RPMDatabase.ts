import glob = require('glob');
import util = require('util');
import child_process = require('child_process')
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

    static log_context = Logger.enterContext('RPMDatabase');

    static async rebuild() {
        Logger.log(RPMDatabase.log_context, 'Loading RPM database...');
        child_process.execSync(`cat digitalis.rpm-macros.base ../rpmbuild/SOURCES/rpm-01-digitalis-macros >digitalis.rpm-macros`);
        const specs = await util.promisify(glob)('../rpmbuild/SPECS/*.spec');
        await Promise.all(specs.map(async spec => {
            if (debug_rpmdb_build) Logger.log(RPMDatabase.log_context, `Processing: ${spec}`);
            for (const profile in Config.get().rpm_profiles) {
                const optset = Config.get().rpm_profiles[profile].options;
                const output = await RPMDatabase.getSpecProvides(spec, optset);
                if (debug_rpmdb_build) Logger.log(RPMDatabase.log_context, output);
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
                    Logger.log(RPMDatabase.log_context, `Couldn't detect dist for ${spec} ${profile}, not building explicit file list`);
                }
            }
        }));
        Logger.log(RPMDatabase.log_context, 'RPM database loaded.');
    }

    static process_cache = new Map<string, string>();

    static async memoize_process(command: string, args: readonly string[], identifier: string, empty_on_error_1: boolean = false): Promise<string> {
        const cache_key = [command, ...args].map(x => `(${x})`).join(", ");
        if (RPMDatabase.process_cache.has(cache_key)) {
            return RPMDatabase.process_cache.get(cache_key);
        } else {
            const proc = child_process.spawn(command, args);
            const stdout: Buffer[] = [];
            proc.stdout.on('data', (data) => {
                stdout.push(data);
            });
            proc.stderr.on('data', (data) => {
                Logger.log(RPMDatabase.log_context, `${identifier} ${data.toString()}`);
            });
            return new Promise<string>((resolve, reject) => {
                proc.on('close', (code, signal) => {
                    if (signal) {
                        reject(`Process ${identifier} killed by signal ${signal}`);
                    } else if (code > 1 || (code && !empty_on_error_1)) {
                        reject(`Process ${identifier} exited with code ${code}`);
                    } else if (code) {
                        resolve("");
                    } else {
                        const result = Buffer.concat(stdout).toString();
                        RPMDatabase.process_cache.set(cache_key, result);
                        resolve(result);
                    }
                })
            });
        }
    }

    static async getSpecProvides(spec: string, optset: string[]): Promise<string> {
        return RPMDatabase.memoize_process(`rpmspec`, ['-q', '--provides', '--macros', 'digitalis.rpm-macros', spec, ...optset], spec, true);
    }

    static async getSpecExplicitFiles(spec: string, optset: string[]): Promise<string[]> {
        const output = await RPMDatabase.memoize_process('rpmspec', ['-P', '--macros', 'digitalis.rpm-macros', spec, ...optset], spec, true);
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
        const output = await RPMDatabase.memoize_process('rpmspec', ['-q', '--' + type, '--macros', 'digitalis.rpm-macros', spec, ...optset], spec, true);
        const ret = output.split("\n").filter(s => s.length > 0);
        if (debug_rpmdb_build) Logger.log(RPMDatabase.log_context, `${type} of ${spec}: ${ret.join("\n")}`);
        return ret;
    }

    static async getPackageRequires(what: package_name, profile: rpm_profile): Promise<string[]> {
        // [ TODO 
        const spec = RPMDatabase.getSpecFromName(what, Config.get().rpm_profiles[profile].dist || profile);
        const optset = Config.get().rpm_profiles[spec.profile].options;
        // TODO ]
        const output = await RPMDatabase.memoize_process('rpmspec', ['-q', '--queryformat', '[%{provides} ];[%{requires} ]\\n', '--macros', 'digitalis.rpm-macros', spec.spec, ...optset], spec.spec, true);
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
        if (debug_rpmdb_build) Logger.log(RPMDatabase.log_context, `Couldn't find ${what} in ${spec.spec}!`);
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

    static async getSrpmFile(what: spec_with_options): Promise<string> {
        const optset = Config.get().rpm_profiles[what.profile].options;
        const output = await RPMDatabase.memoize_process('rpmspec', ['-q', '--srpm', '--macros', 'digitalis.rpm-macros', what.spec, ...optset], what.spec, true);
        const with_arch = output.split('\n')[0];
        return with_arch.split('.').slice(0, -1).join('.');
    }

    static async haveArtifacts(what: spec_file_name, where: rpm_profile): Promise<boolean> {
        const optset = Config.get().rpm_profiles[where].options;
        const output = await RPMDatabase.memoize_process('rpmspec', ['-q', '--rpms', '--macros', 'digitalis.rpm-macros', what, ...optset], what, true);
        for (const line of output.split('\n').filter(s => s.length > 0)) {
            const parts = line.split('.');
            const arch = parts.pop();
            if (!fs.existsSync(path.join('../rpmbuild/RPMS/', arch, `${line}.rpm`))) return false;
        }
        return true;
    }
}