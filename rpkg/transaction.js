"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = exports.Location = void 0;
const semver = require("semver");
var Location;
(function (Location) {
    Location[Location["Host"] = 0] = "Host";
    Location[Location["Target"] = 1] = "Target";
})(Location = exports.Location || (exports.Location = {}));
class Transaction {
    constructor(db) {
        this.host = new Map();
        this.target = new Map();
        this.db = db;
    }
    selectSet(where) {
        if (where == Location.Host) {
            return this.host;
        }
        else {
            return this.target;
        }
    }
    async addToTransaction(atom, where) {
        // If this atom already exists, we should intersect its versions with our atom's versions.
        var intersection_p;
        if (this.selectSet(where).has(atom.asAtom())) {
            const existing = this.selectSet(where).get(atom.asAtom());
            const new_range = new semver.Range(existing.format() + " " + atom.getVersions().format());
            intersection_p = this.db.getAllVersions(atom.withVersion(new semver.Range("*")))
                .then((versions) => {
                const all_semvers = versions.map((sub_atom) => sub_atom.getVersion().version);
                this.selectSet(where).set(atom.asAtom(), semver.simplifyRange(all_semvers, new_range));
            });
        }
        else {
            this.selectSet(where).set(atom.asAtom(), atom.getVersions());
            intersection_p = Promise.resolve();
        }
        return intersection_p;
    }
}
exports.Transaction = Transaction;
