import { Database } from "./db.js";
import * as semver from 'semver';
import { assert } from "console";

export type PackageCategory = string;
export type PackageName = string;

export class Atom {
    private category: PackageCategory;
    private name: PackageName;
    private given_version_spec: string

    constructor(shortpkg_or_category: PackageCategory, pkg?: PackageName, version?: string) {
        if (version) {
            this.category = shortpkg_or_category;
            this.name = pkg;
            this.given_version_spec = version;
        } else if (pkg) {
            this.category = shortpkg_or_category;
            this.name = pkg;
        } else {
            const parsed = /^(?:([a-z-]+)\/)?([a-z0-9-]+)@?(.*)?$/.exec(shortpkg_or_category);
            this.category = parsed[1];
            this.name = parsed[2];
            this.given_version_spec = parsed[3];
        }
    }

    getCategory(): PackageCategory { return this.category; }
    getName(): PackageName { return this.name; }

    async resolveUsingDatabase(db: Database, version_spec?: semver.Range): Promise<ResolvedAtom> {
        const our_name = this.name;

        var category_p: Promise<PackageCategory>;
        var name_p = Promise.resolve(this.name);
        var version_p: Promise<semver.Range>;

        if (this.category) {
            category_p = Promise.resolve(this.category);
        } else {
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
                    return potential_names.map(name => name[0] as PackageCategory);
                })
                .then(async function (categories: PackageCategory[]) {
                    if (categories.length == 0) {
                        throw `Didn't find any potential categories for ${our_name}`;
                    } else if (categories.length > 1) {
                        throw `Found multiple candidates for ${our_name} - specify a category`;
                    } else {
                        return categories[0];
                    }
                });
        }

        // Maybe implement a check against the actual versions
        // here someday?
        if (version_spec) {
            version_p = Promise.resolve(version_spec);
        } else if (this.given_version_spec) {
            version_p = Promise.resolve(new semver.Range(this.given_version_spec));
        } else {
            version_p = Promise.resolve(new semver.Range("*"));
        }

        return Promise.all([category_p, name_p, version_p])
            .then((values) => {
                return new ResolvedAtom(values[0], values[1], values[2]);
            });
    }
};

export class ResolvedAtom extends Atom {
    private versions: semver.Range;

    constructor(category: PackageCategory, name: PackageName, versions: semver.Range) {
        super(category, name);
        this.versions = versions;
    }

    static parse(shortpkg: string): ResolvedAtom {
        const parsed = /^([a-z-]+)\/([a-z0-9-]+)@?([>=<]?=?.*)$/.exec(shortpkg);
        return new ResolvedAtom(parsed[1], parsed[2], new semver.Range(parsed[3]));
    }

    getVersions(): semver.Range { return this.versions; }
    asAtom(version?: string): Atom { return new Atom(this.getCategory(), this.getName(), version); }
    withVersion(version: semver.Range): ResolvedAtom { return new ResolvedAtom(this.getCategory(), this.getName(), version); }
};

export class SingleVersionAtom extends Atom {
    private single_version: semver.SemVer;

    constructor(category: PackageCategory, name: PackageName, version: semver.SemVer) {
        super(category, name);
        this.single_version = version;
    }

    getVersion(): semver.SemVer { return this.single_version; }
};

export default class { Atom };