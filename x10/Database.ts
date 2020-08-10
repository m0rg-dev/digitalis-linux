import { PackageVersion, ResolvedAtom } from "./Atom";
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import * as sqlite3 from 'better-sqlite3';
import { kMaxLength } from "buffer";

export class Database {
    private db_path: string;
    private db: sqlite3.Database;

    private constructor(db_path: string) {
        this.db_path = db_path;
    }

    static construct(db_path: string): Database {
        var self = new Database(db_path);
        self.db = new sqlite3(path.join(self.db_path, "database.sqlite3"));
        self.ensure_tables();
        return self;
    }

    static empty(): Database {
        var self = new Database('');
        self.db = new sqlite3(":memory:");
        self.ensure_tables();
        return self;
    }

    private run_statement(sql: string, params?: any[]) {
        try {
            if(!params) params = [];
            const stmt: sqlite3.Statement = this.db.prepare(sql);
            return stmt.all(...params);
        } catch (e) {
            console.error(e);
            console.error(`Offending SQL is ${sql}`);
            console.error(params);
            throw e;
        }
    }

    private ensure_tables() {
        const package_table_exists = this.run_statement("SELECT * FROM sqlite_master WHERE type='table' AND name='package'");
        if (!(package_table_exists && package_table_exists.length)) {
            this.db.prepare("CREATE TABLE package (id TEXT PRIMARY KEY, version_installed TEXT, version_available TEXT, selected BOOLEAN)").run();
        }
    }

    getInstalledVersion(atom: ResolvedAtom): PackageVersion {
        const installed = this.run_statement('SELECT version_installed FROM package WHERE id = ?', [atom.format()]);
        if (installed && installed.length) return new PackageVersion(installed[0]);
        return null;
    }

    install(atom: ResolvedAtom, version: PackageVersion) {
        this.db.prepare('INSERT INTO package(id, version_installed) VALUES(?, ?) ON CONFLICT(id) DO UPDATE SET version_installed=excluded.version_installed')
            .run([atom.format(), version.version]);
    }

    select(atom: ResolvedAtom) {
        this.db.prepare('INSERT INTO package(id, selected) VALUES(?, TRUE) ON CONFLICT(id) DO UPDATE SET selected=excluded.selected')
            .run([atom.format()]);
    }
}