import { ResolvedAtom, PackageVersion } from "./atom.js";
import * as path from 'path';
import * as YAML from 'yaml';
import * as crypto from 'crypto';

export class ManifestObject {
    path: string;
    hash: string;
    size: number;

    constructor(path?: string, data?: Buffer) {
        this.path = path;
        if (data) {
            this.size = data.length;
            var shasum = crypto.createHash('sha256');
            shasum.update(data);
            this.hash = shasum.digest('hex');
        }
    }


    static fromYAML(raw: object): ManifestObject {
        var o = new ManifestObject();
        o.path = raw['path'];
        o.hash = raw['hash'];
        o.size = raw['size'];
        return o;
    }
}

export class ManifestPackage extends ManifestObject {
    atom: ResolvedAtom;
    version: PackageVersion;

    constructor(atom: ResolvedAtom, version: PackageVersion, path?: string, data?: Buffer) {
        super(path, data);
        this.atom = atom;
        this.version = version;
    }


    static fromYAML(raw: object): ManifestPackage {
        const atom = ResolvedAtom.fromYAML(raw['atom']);
        const version = PackageVersion.fromYAML(raw['version']);
        var o = new ManifestPackage(atom, version, raw['path']);
        o.hash = raw['hash'];
        o.size = raw['size'];
        return o;
    }
}

export class Manifest {
    builds: Object;
    packages: Object;
    sources: Object;
    categories: Set<string>;
    serial: number;

    constructor() {
        this.builds = {};
        this.packages = {};
        this.sources = {};
        this.categories = new Set();
    }

    addPackage(pkg: ManifestPackage) {
        this.packages[pkg.atom.format()] = pkg;
        this.categories.add(pkg.atom.getCategory());
    }

    addBuild(build: ManifestPackage) {
        this.builds[build.atom.format()] = build;
    }

    addSource(source: ManifestObject) {
        this.sources[path.basename(source.path)] = source;
    }

    getPackage(key: ResolvedAtom): ManifestPackage {
        return this.packages[key.format()];
    }

    getAllPackages(): ManifestPackage[] {
        var r: ManifestPackage[] = [];
        for (const formatted_atom in this.packages) {
            r.push(this.packages[formatted_atom]);
        }
        return r;
    }

    getBuild(key: ResolvedAtom): ManifestPackage {
        return this.builds[key.format()];
    }

    getCategories(): string[] {
        return Array.from(this.categories.values());
    }


    static deserialize(yml: string): Manifest {
        const parsed = YAML.parse(yml);
        var o = new Manifest();
        for (const key in parsed.packages) {
            o.addPackage(ManifestPackage.fromYAML(parsed.packages[key]));
        }
        for (const key in parsed.builds) {
            o.addPackage(ManifestPackage.fromYAML(parsed.builds[key]));
        }
        for (const key in parsed.sources) {
            o.addSource(ManifestObject.fromYAML(parsed.sources[key]));
        }
        return Object.assign(new Manifest(), YAML.parse(yml));
    }

    serialize(): string {
        this.serial = Math.trunc(Date.now() / 1000);
        return YAML.stringify(this);
    }
}
