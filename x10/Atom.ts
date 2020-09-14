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

    static async resolveUsingRepository(partial: string, repo: Repository): Promise<Atom> {
        const our_name = partial.includes('/') ? partial.split('/')[1] : partial;
        // TODO this is still pretty hokey
        if (partial.includes('/')) {
            return partial;
        } else {
            const cats = await repo.getAllCategories();
            const all_names = (await Promise.all(
                cats.map(category => repo.getAllNames(category).then(names => names.map(name => [category, name]))))
            ).flat(1);
            const potential_categories: PackageCategory[]
                = all_names.filter(name => name[1] == our_name).map(name => name[0]);
            if (potential_categories.length == 0) {
                throw `Didn't find any potential categories for ${our_name}`;
            } else if(potential_categories.length > 1) {
                throw `Found multiple candidates for ${our_name} - specify a category`;
            } else {
                return potential_categories[0] + '/' + name;
            }
        }
    }
}

export class PackageVersion {
    version: string;

    constructor(version: string) {
        this.version = version;
    }

    compare(other: PackageVersion): number {
        if (!other) return 1;

        const parts_1 = this.version.toString().split('.');
        const parts_2 = other.version.toString().split('.');

        const min_length = Math.min(parts_1.length, parts_2.length);
        // 1.2.3 > 0.1.2
        for (var i = 0; i < min_length; i++) {
            if (parts_1[i] > parts_2[i]) return 1;
            if (parts_1[i] < parts_2[i]) return -1;
        }
        // 1.2.3 = 1.2.3
        if (parts_1.length == parts_2.length) return 0;
        // 1.2.3.1 > 1.2.3
        if (parts_1.length > parts_2.length) return 1;
        return -1;
    }

    static fromYAML(raw: object): PackageVersion {
        const version = raw['version'];
        return new PackageVersion(version);
    }
}