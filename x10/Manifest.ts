import { ResolvedAtom, PackageVersion } from "./Atom.js";
import * as path from 'path';
import * as YAML from 'yaml';
import * as crypto from 'crypto';
import { Scalar } from "yaml/types";
import { Type } from "yaml/util";

enum ObjectType {
    File,
    Blob
}

export abstract class ManifestObject {
    type: ObjectType;

    abstract async sign(private_key: string): Promise<void>;
    abstract async verify(package_key: string): Promise<boolean>;
    abstract toYAML(): Object;
}

export class ManifestFile extends ManifestObject {
    size: number;
    hash: string;
    sig: Buffer;
    data: Buffer;

    constructor(data: Buffer) {
        super();
        this.type = ObjectType.File;
        this.data = data;
        this.size = data.length;
        var shasum = crypto.createHash('sha256');
        shasum.update(data);
        this.hash = shasum.digest('hex');
    }

    async sign(private_key: string): Promise<void> {
        this.sig = crypto.sign(null, this.data, private_key);
    }

    async verify(package_key: string): Promise<boolean> {
        return false;
    }

    toYAML(): Object {
        return {
            type: ObjectType[this.type],
            size: this.size,
            hash: this.hash,
            sig: this.sig.toString('base64')
        };
    }
}

export class ManifestBlob extends ManifestObject {
    data: Buffer;

    constructor(data: Buffer) {
        super();
        this.type = ObjectType.Blob;
        this.data = data;
    }

    // meaningless on an object stored in the manifest
    async sign(private_key: string): Promise<void> {
        return;
    }

    // Objects inside the manifest are always OK (they're hashed as part of the whole manifest)
    async verify(package_key: string): Promise<boolean> {
        return true;
    }

    toYAML(): Object {
        return {
            type: ObjectType[this.type],
            data: this.data.toString('base64')
        }
    }
}

export class Manifest {
    objects: Map<string, ManifestObject>;
    private_key: string;

    constructor() {
        this.objects = new Map();
    }

    registerPrivateKey(private_key: string) {
        this.private_key = private_key;
    }

    addFile(path: string, data: Buffer) {
        let obj = new ManifestFile(data);
        if (this.private_key) obj.sign(this.private_key);
        this.objects.set(path, obj);
    }

    addBlob(path: string, data: Buffer) {
        let obj = new ManifestBlob(data);
        this.objects.set(path, obj);
    }

    serialize(): string {
        let obj = {
            objects: {},
            sig: undefined
        };

        for (let path of this.objects.keys()) {
            obj.objects[path] = this.objects.get(path).toYAML();
        }

        if (this.private_key) {
            obj.sig = crypto.sign(null, Buffer.from(YAML.stringify(obj.objects)), this.private_key).toString('base64');
        }
        YAML.scalarOptions.str.defaultType = Type.QUOTE_DOUBLE;
        YAML.scalarOptions.str.fold = { lineWidth: 80, minContentWidth: 20 };
        return YAML.stringify(obj);
    }
}

export class old_ManifestObject {
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

    static fromYAML(raw: object): old_ManifestObject {
        var o = new old_ManifestObject();
        o.path = raw['path'];
        o.hash = raw['hash'];
        o.size = raw['size'];
        return o;
    }
}

export class ManifestPackage extends old_ManifestObject {
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

export class old_Manifest {
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

    addSource(source: old_ManifestObject) {
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

    getSource(key: string): old_ManifestObject {
        return this.sources[key];
    }

    getCategories(): string[] {
        return Array.from(this.categories.values());
    }


    static deserialize(yml: string): old_Manifest {
        const parsed = YAML.parse(yml);
        var o = new old_Manifest();
        for (const key in parsed.packages) {
            o.addPackage(ManifestPackage.fromYAML(parsed.packages[key]));
        }
        for (const key in parsed.builds) {
            o.addBuild(ManifestPackage.fromYAML(parsed.builds[key]));
        }
        for (const key in parsed.sources) {
            o.addSource(old_ManifestObject.fromYAML(parsed.sources[key]));
        }
        return o;
    }

    serialize(): string {
        this.serial = Math.trunc(Date.now() / 1000);
        return YAML.stringify(this);
    }
}
