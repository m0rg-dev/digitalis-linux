import { PackageVersion, ResolvedAtom } from "./Atom";
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import * as sqlite3 from 'better-sqlite3';
import { kMaxLength } from "buffer";
import { pack } from "tar-stream";

export class Database {
    private db_path: string;
    private db: sqlite3.Database;

    private constructor(db_path: string) {
        this.db_path = db_path;
    }

    static construct(db_path: string): Database {
        var self = new Database(db_path);
        self.db = new sqlite3(path.join(self.db_path, "database.sqlite3"));
        self.db.pragma('journal_mode = WAL');
        // is EXTRA really necessary? probably not. but we're not asking a whole lot of
        // sqlite with regards to performance anyways and nobody wants a broken pkgdb
        self.db.pragma('synchronous = EXTRA');
        self.ensure_tables();
        return self;
    }

    static empty(): Database {
        var self = new Database('');
        self.db = new sqlite3(":memory:");
        self.ensure_tables();
        return self;
    }

    private ensure_tables() {
        this.db.prepare("CREATE TABLE IF NOT EXISTS package (id TEXT PRIMARY KEY, version_installed TEXT, version_available TEXT, selected BOOLEAN)").run();
        this.db.prepare("CREATE TABLE IF NOT EXISTS file (path TEXT, package_id TEXT, type TEXT, PRIMARY KEY(path, package_id))").run();
        this.db.prepare("CREATE TABLE IF NOT EXISTS packages_pending (id TEXT PRIMARY KEY)").run();
    }

    print_stats() {
        const packages = this.db.prepare("SELECT count(*) FROM package WHERE version_installed IS NOT NULL").get();
        const files = this.db.prepare("WITH unique_files AS (SELECT DISTINCT path FROM file) SELECT count(*) FROM unique_files").get();
        console.warn(`${packages['count(*)']} packages are currently installed.`);
        console.warn(`${files['count(*)']} files are currently installed`);
    }

    getInstalledVersion(atom: ResolvedAtom): PackageVersion {
        const installed = this.db.prepare('SELECT version_installed FROM package WHERE id = ?').all([atom.format()]);
        if (installed && installed.length) return new PackageVersion(installed[0]);
        return null;
    }

    // TODO actually go and do the work to make sure all this stuff runs concurrently. it definitely won't yet.
    transaction(callback: any) {
        this.db.prepare('BEGIN').run();
        callback();
        this.db.prepare('COMMIT').run();
    }

    add_file(atom: ResolvedAtom, path: string, type: string) {
        this.db.prepare('INSERT INTO file(path, package_id, type) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').run([path, atom.format(), type])
    }

    install_pending(atom: ResolvedAtom) {
        this.db.prepare('INSERT INTO packages_pending(id) VALUES(?)').run([atom.format()]);
    }

    install(atom: ResolvedAtom, version: PackageVersion) {
        this.db.prepare('BEGIN').run();
        this.db.prepare('INSERT INTO package(id, version_installed) VALUES(?, ?) ON CONFLICT(id) DO UPDATE SET version_installed=excluded.version_installed')
            .run([atom.format(), version.version]);
        this.db.prepare('DELETE FROM packages_pending WHERE id = ?').run([atom.format()]);
        this.db.prepare('COMMIT').run();
    }

    select(atom: ResolvedAtom) {
        this.db.prepare('INSERT INTO package(id, selected) VALUES(?, TRUE) ON CONFLICT(id) DO UPDATE SET selected=excluded.selected')
            .run([atom.format()]);
    }
}