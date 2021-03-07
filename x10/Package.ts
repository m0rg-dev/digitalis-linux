import * as child_process from 'child_process';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import base32 from 'base32';
import Logger from './Logger';

import Spec from "./Spec";

export type Paths = Partial<{
    binaries: string[],
    shared_libraries: string[],
    headers: string[],
    pkg_config: string[],
    dynamic_linker: string[]
}>;

// export type CacheMeta = {
//     builder: string,
//     built_at: number,
//     hash: string,
//     fqn: string,
//     dependency_paths: string[],
//     paths: Paths
// };

/**
 * src_hash: Hash (base32 SHA-256) of the package spec.
 * build_hash: Hash of the built tree, not including src/.
 * fqn: Name + version + src_hash of the package.
 * dependencies: Names and versions of runtime dependencies.
 * built_against: fqns of build-time dependencies used.
 */

export type BuildResult = {
    src_hash: string,
    build_hash: string,
    fqn: string,
    dependencies: string[],
    built_against: string[],
    paths: Paths
};

export class Package {
    spec: Spec;

    constructor(spec: Spec) {
        this.spec = spec;
    }

    async build(): Promise<BuildResult> {
        await this.spec.build();

        const x10_hash = crypto.createHash('sha256');
        x10_hash.update(await fs.readFile(__dirname + '/../.tsbuildinfo'));
        this.spec.built_against.push(`x10 = ${base32.encode(x10_hash.digest())}`);

        // lol
        const rc = child_process.spawnSync(`find ${this.spec.root()} -not \\( -path ${this.spec.root()}/src -prune \\) -type f -o -type l | xargs sha256sum`, { shell: true });
        const hash = crypto.createHash('sha256');
        hash.update(rc.stdout);

        return {
            src_hash: this.spec.src_hash(),
            fqn: this.spec.hfqn(),
            paths: this.spec.export_paths,
            built_against: this.spec.built_against,
            dependencies: this.spec.dependencies().map(x => x.fqn()),
            build_hash: base32.encode(hash.digest())
        };
    }
}

