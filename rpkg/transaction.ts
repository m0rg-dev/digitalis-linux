import { Atom, ResolvedAtom } from "./atom";
import * as semver from 'semver';
import { Database } from "./db";

export enum Location {
    Host,
    Target
}

export class Transaction {
    private host: Map<Atom, semver.Range>;
    private target: Map<Atom, semver.Range>;
    private db: Database;

    constructor(db: Database) {
        this.host = new Map<Atom, semver.Range>();
        this.target = new Map<Atom, semver.Range>();
        this.db = db;
    }

    private selectSet(where: Location): Map<Atom, semver.Range> {
        if (where == Location.Host) {
            return this.host;
        } else {
            return this.target;
        }
    }

    async addToTransaction(atom: ResolvedAtom, where: Location) {
        var intersection_p: Promise<void>;
        if (this.selectSet(where).has(atom.asAtom())) {
            const existing = this.selectSet(where).get(atom.asAtom());
            const new_range = new semver.Range(existing.format() + " " + atom.getVersions().format());
            intersection_p = this.db.getAllVersions(atom.withVersion(new semver.Range("*")))
                .then((versions) => {
                    const all_semvers = versions.map((sub_atom) => sub_atom.getVersion().version);
                    this.selectSet(where).set(atom.asAtom(),
                        semver.simplifyRange(all_semvers, new_range) as semver.Range);
                });
        } else {
            this.selectSet(where).set(atom.asAtom(), atom.getVersions());
            intersection_p = Promise.resolve();
        }

        return intersection_p;
    }
}