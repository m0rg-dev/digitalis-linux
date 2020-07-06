import { PackageVersion, ResolvedAtom } from "./atom";
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';

export class Database {
    private selected_packages: Set<string>;
    private installed_packages: Map<string, PackageVersion>;

    private db_path: string;

    private constructor(db_path: string) {
        this.db_path = db_path;
    }

    static async construct(db_path: string): Promise<Database> {
        var self = new Database(db_path);
        return self.reload().then(() => self);
    }

    async reload() {
        var self = this;
        return fs.promises.access(path.join(this.db_path, "database.yml"), fs.constants.R_OK)
        .then(async function () {
            const data = await fs.promises.readFile(path.join(this.db_path, "database.yml"));
            const obj = YAML.parse(data.toString('utf8'), {mapAsMap: true});
            self.selected_packages = obj.selected;
            self.installed_packages = obj.installed;
        })
        .catch(function () {
            self.selected_packages = new Set();
            self.installed_packages = new Map();
        });
    }

    async commit() {
        return fs.promises.writeFile(path.join(this.db_path, "database.yml"), YAML.stringify({
            selected: this.selected_packages,
            installed: this.installed_packages
        }));
    }

    getInstalledVersion(atom: ResolvedAtom): PackageVersion {
        return this.installed_packages.get(atom.format());
    }
}