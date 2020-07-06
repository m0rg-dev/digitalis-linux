"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Step = exports.Transaction = exports.Location = void 0;
const atom_1 = require("./atom");
const wrap = require("word-wrap");
var Location;
(function (Location) {
    Location["Host"] = "Host";
    Location["Target"] = "Target";
})(Location = exports.Location || (exports.Location = {}));
class Transaction {
    constructor(repo, hostdb, targetdb) {
        this.tx = new Map();
        this.repo = repo;
        this.hostdb = hostdb;
        this.targetdb = targetdb;
    }
    selectDb(where) {
        if (where == Location.Host) {
            return this.hostdb;
        }
        else {
            return this.targetdb;
        }
    }
    static getKey(atom, where) {
        return `${where.toString()} ${atom.format()}`;
    }
    async addToTransaction(atom, where) {
        const desc_p = this.repo.getPackageDescription(atom);
        const build_p = this.repo.buildExists(atom);
        return Promise.all([desc_p, build_p]).then(async (values) => {
            const desc = values[0];
            const have_build = values[1];
            if (this.selectDb(where).getInstalledVersion(atom)
                && this.selectDb(where).getInstalledVersion(atom).compare(desc.version) == 0)
                return;
            var all_depends = [];
            if (!have_build) {
                desc.bdepend.forEach(bdepend => all_depends.push(Transaction.getKey(bdepend, Location.Host)));
            }
            desc.rdepend.forEach(rdepend => all_depends.push(Transaction.getKey(rdepend, where)));
            this.tx.set(Transaction.getKey(atom, where), all_depends);
            var promises = [];
            if (!have_build) {
                for (const bdepend of desc.bdepend) {
                    if (!this.tx.has(Transaction.getKey(bdepend, Location.Host))) {
                        promises.push(this.addToTransaction(bdepend, Location.Host));
                    }
                }
            }
            for (const rdepend of desc.rdepend) {
                if (!this.tx.has(Transaction.getKey(rdepend, where))) {
                    promises.push(this.addToTransaction(rdepend, where));
                }
            }
            await Promise.all(promises);
        });
    }
    async plan() {
        var L = [];
        var unmarked = new Set(this.tx.keys());
        var tempmarked = new Set();
        while (unmarked.size) {
            const n = unmarked.values().next().value;
            this.visit(L, unmarked, tempmarked, n);
        }
        console.log(L);
        var binfetch = [];
        var srcfetch = [];
        var install = [];
        for (const pkg of L) {
            const a = pkg.split(' ');
            const where = (a[0] == Location.Host.toString()) ? Location.Host : Location.Target;
            const atom = atom_1.ResolvedAtom.parse(a[1]);
            if (await this.repo.buildExists(atom)) {
                binfetch.push(new Step(StepType.FetchBinary, atom));
            }
            else {
                srcfetch.push(new Step(StepType.FetchSource, atom));
                install.push(new Step(StepType.Build, atom));
            }
            install.push(new Step((where == Location.Host) ? StepType.HostInstall : StepType.TargetInstall, atom));
        }
        return binfetch.concat(srcfetch, install);
    }
    visit(L, unmarked, tempmarked, n) {
        if (!unmarked.has(n))
            return;
        if (tempmarked.has(n)) {
            // TODO figure out which dependencies
            console.warn(`${n} will be installed prior to some of its dependencies!`);
            return;
        }
        tempmarked.add(n);
        for (const m of this.tx.get(n)) {
            this.visit(L, unmarked, tempmarked, m);
        }
        tempmarked.delete(n);
        unmarked.delete(n);
        L.push(n);
    }
    static displayPlan(p) {
        var by_type = new Map();
        for (const step of p) {
            if (!by_type.has(step.type))
                by_type.set(step.type, []);
            by_type.get(step.type).push(step.what.format());
        }
        if (by_type.has(StepType.FetchBinary))
            console.log(wrap(`Fetching binaries: ${by_type.get(StepType.FetchBinary).join(" ")}`, { width: 132 }).trim());
        if (by_type.has(StepType.FetchSource))
            console.log(wrap(`Fetching source code: ${by_type.get(StepType.FetchSource).join(" ")}`, { width: 132 }).trim());
        if (by_type.has(StepType.Build))
            console.log(wrap(`Compiling: ${by_type.get(StepType.Build).join(" ")}`, { width: 132 }).trim());
        if (by_type.has(StepType.HostInstall))
            console.log(wrap(`Installing to host: ${by_type.get(StepType.HostInstall).join(" ")}`, { width: 132 }).trim());
        if (by_type.has(StepType.TargetInstall))
            console.log(wrap(`Installing to target: ${by_type.get(StepType.TargetInstall).join(" ")}`, { width: 132 }).trim());
    }
}
exports.Transaction = Transaction;
;
var StepType;
(function (StepType) {
    StepType["FetchBinary"] = "FetchBinary";
    StepType["FetchSource"] = "FetchSource";
    StepType["Build"] = "Build";
    StepType["HostInstall"] = "HostInstall";
    StepType["TargetInstall"] = "TargetInstall";
})(StepType || (StepType = {}));
;
class Step {
    constructor(type, what) {
        this.type = type;
        this.what = what;
    }
}
exports.Step = Step;
;
