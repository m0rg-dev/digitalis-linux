"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manifest = exports.ManifestPackage = exports.ManifestObject = void 0;
const atom_js_1 = require("./atom.js");
const path = require("path");
const YAML = require("yaml");
const crypto = require("crypto");
class ManifestObject {
    constructor(path, data) {
        this.path = path;
        if (data) {
            this.size = data.length;
            var shasum = crypto.createHash('sha256');
            shasum.update(data);
            this.hash = shasum.digest('hex');
        }
    }
    static fromYAML(raw) {
        var o = new ManifestObject();
        o.path = raw['path'];
        o.hash = raw['hash'];
        o.size = raw['size'];
        return o;
    }
}
exports.ManifestObject = ManifestObject;
class ManifestPackage extends ManifestObject {
    constructor(atom, version, path, data) {
        super(path, data);
        this.atom = atom;
        this.version = version;
    }
    static fromYAML(raw) {
        const atom = atom_js_1.ResolvedAtom.fromYAML(raw['atom']);
        const version = atom_js_1.PackageVersion.fromYAML(raw['version']);
        var o = new ManifestPackage(atom, version, raw['path']);
        o.hash = raw['hash'];
        o.size = raw['size'];
        return o;
    }
}
exports.ManifestPackage = ManifestPackage;
class Manifest {
    constructor() {
        this.builds = {};
        this.packages = {};
        this.sources = {};
        this.categories = new Set();
    }
    addPackage(pkg) {
        this.packages[pkg.atom.format()] = pkg;
        this.categories.add(pkg.atom.getCategory());
    }
    addBuild(build) {
        this.builds[build.atom.format()] = build;
    }
    addSource(source) {
        this.sources[path.basename(source.path)] = source;
    }
    getPackage(key) {
        return this.packages[key.format()];
    }
    getAllPackages() {
        var r = [];
        for (const formatted_atom in this.packages) {
            r.push(this.packages[formatted_atom]);
        }
        return r;
    }
    getBuild(key) {
        return this.builds[key.format()];
    }
    getCategories() {
        return Array.from(this.categories.values());
    }
    static deserialize(yml) {
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
    serialize() {
        this.serial = Math.trunc(Date.now() / 1000);
        return YAML.stringify(this);
    }
}
exports.Manifest = Manifest;
