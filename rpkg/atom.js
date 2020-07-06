"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageVersion = exports.ResolvedAtom = exports.Atom = void 0;
class Atom {
    constructor(shortpkg_or_category, pkg, version) {
        if (version) {
            this.category = shortpkg_or_category;
            this.name = pkg;
        }
        else if (pkg) {
            this.category = shortpkg_or_category;
            this.name = pkg;
        }
        else {
            const parsed = /^(?:([a-z-]+)\/)?([a-z0-9-]+)$/.exec(shortpkg_or_category);
            this.category = parsed[1];
            this.name = parsed[2];
        }
    }
    getCategory() { return this.category; }
    getName() { return this.name; }
    format() { return this.category + "/" + this.name; }
    async resolveUsingRepository(repo) {
        const our_name = this.name;
        var category_p;
        var name_p = Promise.resolve(this.name);
        if (this.category) {
            category_p = Promise.resolve(this.category);
        }
        else {
            // We have no category, so let's go ahead and spin through
            // all of the categories until we find ourself.
            category_p = repo.getAllCategories()
                .then(async function (categories) {
                return Promise.all(categories.map(category => repo.getAllNames(category)
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
        return Promise.all([category_p, name_p])
            .then((values) => {
            return new ResolvedAtom(values[0], values[1]);
        });
    }
}
exports.Atom = Atom;
;
class ResolvedAtom extends Atom {
    static parse(shortpkg) {
        const parsed = /^([a-z-]+)\/([a-z0-9-]+)$/.exec(shortpkg);
        if (!parsed) {
            throw `Bad shortpkg ${shortpkg}`;
        }
        return new ResolvedAtom(parsed[1], parsed[2]);
    }
}
exports.ResolvedAtom = ResolvedAtom;
;
class PackageVersion {
    constructor(version) {
        this.version = version;
    }
    compare(other) {
        const parts_1 = this.version.split('.');
        const parts_2 = other.version.split('.');
        const min_length = Math.min(parts_1.length, parts_2.length);
        // 1.2.3 > 0.1.2
        for (var i = 0; i < min_length; i++) {
            if (parts_1[i] > parts_2[i])
                return 1;
            if (parts_1[i] < parts_2[i])
                return -1;
        }
        // 1.2.3 = 1.2.3
        if (parts_1.length == parts_2.length)
            return 0;
        // 1.2.3.1 > 1.2.3
        if (parts_1.length > parts_2.length)
            return 1;
        return -1;
    }
}
exports.PackageVersion = PackageVersion;
