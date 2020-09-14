import { Repository } from "./Repository.js";

export type PackageCategory = string;
export type PackageName = string;
export type Atom = string;

export class AtomUtils {
    static getCategory(atom: Atom): PackageCategory {
        return atom.split('/')[0];
    }

    static getName(atom: Atom): PackageName {
        return atom.split('/')[1];
    }
}

export class old_Atom {
    private category: PackageCategory;
    private name: PackageName;

    constructor(shortpkg_or_category: PackageCategory, pkg?: PackageName, version?: string) {
        if (version) {
            this.category = shortpkg_or_category;
            this.name = pkg;
        } else if (pkg) {
            this.category = shortpkg_or_category;
            this.name = pkg;
        } else {
            const parsed = /^(?:([a-z-]+)\/)?([a-z0-9-]+)$/.exec(shortpkg_or_category);
            if(!parsed) throw `Couldn't parse shortpkg ${shortpkg_or_category}`;
            this.category = parsed[1];
            this.name = parsed[2];
        }
    }

    getCategory(): PackageCategory { return this.category; }
    getName(): PackageName { return this.name; }
    format(): string { return this.category + "/" + this.name }

    async resolveUsingRepository(repo: Repository): Promise<Atom> {
        const our_name = this.name;

        var category_p: Promise<PackageCategory>;
        var name_p = Promise.resolve(this.name);

        if (this.category) {
            category_p = Promise.resolve(this.category);
        } else {
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


        return Promise.all([category_p, name_p])
            .then((values) => {
                return values[0] + '/' + values[1];
            });
    }
};

export class PackageVersion {
    version: string;

    constructor(version: string) {
        this.version = version;
    }

    compare(other: PackageVersion): number {
        if(!other) return 1;

        const parts_1 = this.version.toString().split('.');
        const parts_2 = other.version.toString().split('.');

        const min_length = Math.min(parts_1.length, parts_2.length);
        // 1.2.3 > 0.1.2
        for(var i = 0; i < min_length; i++) {
            if(parts_1[i] > parts_2[i]) return 1;
            if(parts_1[i] < parts_2[i]) return -1;
        }
        // 1.2.3 = 1.2.3
        if(parts_1.length == parts_2.length) return 0;
        // 1.2.3.1 > 1.2.3
        if(parts_1.length > parts_2.length) return 1;
        return -1;
    }

    static fromYAML(raw: object): PackageVersion {
        const version = raw['version'];
        return new PackageVersion(version);
    }
}