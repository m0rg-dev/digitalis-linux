"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleVersionAtom = exports.ResolvedAtom = exports.Atom = void 0;
const semver = require("semver");
class Atom {
    constructor(shortpkg_or_category, pkg, version) {
        if (version) {
            this.category = shortpkg_or_category;
            this.name = pkg;
            this.given_version_spec = version;
        }
        else if (pkg) {
            this.category = shortpkg_or_category;
            this.name = pkg;
        }
        else {
            const parsed = /^(?:([a-z-]+)\/)?([a-z0-9-]+)@?(.*)?$/.exec(shortpkg_or_category);
            this.category = parsed[1];
            this.name = parsed[2];
            this.given_version_spec = parsed[3];
        }
    }
    getCategory() { return this.category; }
    getName() { return this.name; }
    async resolveUsingDatabase(db, version_spec) {
        const our_name = this.name;
        var category_p;
        var name_p = Promise.resolve(this.name);
        var version_p;
        if (this.category) {
            category_p = Promise.resolve(this.category);
        }
        else {
            // We have no category, so let's go ahead and spin through
            // all of the categories until we find ourself.
            category_p = db.getAllCategories()
                .then(async function (categories) {
                return Promise.all(categories.map(category => db.getAllNames(category)
                    .then(names => names.map(name => [category, name]))));
            })
                .then(async function (structured_names) {
                const all_names = structured_names.flat(1);
                const potential_names = all_names.filter(name => name[1] == our_name);
                return potential_names.map(name => name[0]);
            })
                .then(async function (categories) {
                if (categories.length == 0) {
                    throw `Didn't find any potential categories for ${our_name}`;
                }
                else if (categories.length > 1) {
                    throw `Found multiple candidates for ${our_name} - specify a category`;
                }
                else {
                    return categories[0];
                }
            });
        }
        // Maybe implement a check against the actual versions
        // here someday?
        if (version_spec) {
            version_p = Promise.resolve(version_spec);
        }
        else if (this.given_version_spec) {
            version_p = Promise.resolve(new semver.Range(this.given_version_spec));
        }
        else {
            version_p = Promise.resolve(new semver.Range("*"));
        }
        return Promise.all([category_p, name_p, version_p])
            .then((values) => {
            return new ResolvedAtom(values[0], values[1], values[2]);
        });
    }
}
exports.Atom = Atom;
;
class ResolvedAtom extends Atom {
    constructor(category, name, versions) {
        super(category, name);
        this.versions = versions;
    }
    static parse(shortpkg) {
        const parsed = /^([a-z-]+)\/([a-z0-9-]+)@?([>=<]?=?.*)$/.exec(shortpkg);
        return new ResolvedAtom(parsed[1], parsed[2], new semver.Range(parsed[3]));
    }
    getVersions() { return this.versions; }
    asAtom(version) { return new Atom(this.getCategory(), this.getName(), version); }
    withVersion(version) { return new ResolvedAtom(this.getCategory(), this.getName(), version); }
}
exports.ResolvedAtom = ResolvedAtom;
;
class SingleVersionAtom extends Atom {
    constructor(category, name, version) {
        super(category, name);
        this.single_version = version;
    }
    getVersion() { return this.single_version; }
}
exports.SingleVersionAtom = SingleVersionAtom;
;
class default_1 {
}
exports.default = default_1;
;
