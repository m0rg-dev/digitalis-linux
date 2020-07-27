"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const atom_1 = require("./atom");
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
class Database {
    constructor(db_path) {
        this.db_path = db_path;
    }
    static async construct(db_path) {
        var self = new Database(db_path);
        self.realdb = true;
        await self.reload();
        return self;
    }
    static empty() {
        var self = new Database('');
        self.realdb = false;
        self.selected_packages = new Set();
        self.installed_packages = new Map();
        return self;
    }
    async reload() {
        if (!this.realdb)
            throw "Attempt to call reload() on a fake database";
        var self = this;
        self.selected_packages = new Set();
        self.installed_packages = new Map();
        return fs.promises.access(path.join(self.db_path, "database.yml"), fs.constants.R_OK)
            .then(async function () {
            const data = await fs.promises.readFile(path.join(self.db_path, "database.yml"));
            const obj = YAML.parse(data.toString('utf8'));
            for (const selected of obj.selected) {
                self.selected_packages.add(selected);
            }
            for (const installed in obj.installed) {
                self.installed_packages.set(installed, atom_1.PackageVersion.fromYAML(obj.installed[installed]));
            }
        })
            .catch(function (err) {
            console.warn(`Couldn't read database: ${err}`);
            // the database might not exist. may want to create it with the
            // rpkg package itself rather than rebuilding it on errors because
            // that's potentially dangerous
        });
    }
    async commit() {
        // actually this is probably fine
        //if(!this.realdb) throw "Attempt to call commit() on a fake database";
        return fs.promises.writeFile(path.join(this.db_path, "database.yml"), YAML.stringify({
            selected: this.selected_packages,
            installed: this.installed_packages
        }));
    }
    getInstalledVersion(atom) {
        return this.installed_packages.get(atom.format());
    }
    install(atom, version) {
        this.installed_packages.set(atom.format(), version);
    }
    select(atom) {
        this.selected_packages.add(atom.format());
    }
}
exports.Database = Database;
