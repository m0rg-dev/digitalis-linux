import { Mutex } from "async-mutex";
import program from 'commander';
import * as ink from 'ink';
import * as React from "react";
import * as uuid from 'uuid';
import * as readline from 'readline';
import * as fs from 'fs';
import { Config } from "./Config";
import { Container, image_name } from "./Container";
import { Logger, LogLine } from "./Logger";
import { BuiltPackage, FailureType, Package } from "./Package";
import { PlanProgress } from "./PlanSpinner";
import { package_name, RPMDatabase } from "./RPMDatabase";
import { TUI } from "./TUI";
import { Updater } from "./Updater";
import { LogLines } from "./LogInfo";

function filterDuplicateBuilds(list: BuiltPackage[]): BuiltPackage[] {
    const r: BuiltPackage[] = [];
    const seen_builds = new Set<string>();
    for (const pkg of list) {
        const key = `${pkg.spec.spec}:${pkg.spec.profile}`;
        if (!seen_builds.has(key)) r.push(pkg);
        seen_builds.add(key);
    }
    return r;
}

async function filterExistingBuilds(list: BuiltPackage[]): Promise<BuiltPackage[]> {
    const r: BuiltPackage[] = []
    for (const pkg of list) {
        if (!await pkg.alreadyDone()) r.push(pkg);
    }
    return r;
}

function allBuiltPackages(list: Package[]): list is BuiltPackage[] {
    return list.every(x => x instanceof BuiltPackage);
}

async function prepareImage(image: image_name): Promise<BuiltPackage[]> {
    if (await (new Container(image, undefined)).imagePresent()) return [];
    const pkgs: Package[] = await Promise.all(Config.get().build_images[image].install_packages
        .map((name: package_name) => Package.resolve(name, image))
    );
    if (!allBuiltPackages(pkgs)) throw new Error("oops");
    return pkgs;
}

async function orderPackageSet(packages: Package[], statusCallback: ((status: PlanProgress) => void) = () => { }): Promise<BuiltPackage[]> {
    const dispatched = new Map<string, Package>();
    const ordered: Package[] = [];
    const pending = new Map<string, Package>();
    const log_context = Logger.enterContext('orderPackageSet');

    packages.forEach(pkg => pending.set(pkg.hash(), pkg));

    while (pending.size) {
        for (const pkg of pending.values()) {
            var have_prereqs = true;
            for (const prerequisite of Array.from((await pkg.buildDependencies()).values()).filter(x => x instanceof BuiltPackage)) {
                if (!dispatched.has(prerequisite.hash())) {
                    have_prereqs = false;
                    pending.set(prerequisite.hash(), prerequisite);
                }
            }
            if (have_prereqs) {
                pending.delete(pkg.hash());
                ordered.push(pkg);
                dispatched.set(pkg.hash(), pkg);
                for (const corequisite of Array.from((await pkg.installDependencies()).values()).filter(x => x instanceof BuiltPackage)) {
                    if (!dispatched.has(corequisite.hash())) {
                        pending.set(corequisite.hash(), corequisite);
                    }
                }
                Logger.log(log_context, `Dispatched: ${pkg.name}:${pkg.installed_on} (${pending.size} remaining)`);
                statusCallback({ resolved: ordered.length, remaining: pending.size, currently_working_on: `${pkg.name}:${pkg.installed_on}`, done: false });
            }
        }
    }

    if (!allBuiltPackages(ordered)) throw new Error("huh?");
    statusCallback({ resolved: ordered.length, remaining: pending.size, currently_working_on: "", done: true });

    return filterDuplicateBuilds(ordered);
}

function combine(map: Map<string, BuiltPackage>, list: BuiltPackage[]) { list.forEach(x => map.set(x.hash(), x)) }

async function doBuild(tui: TUI, requirements: Map<string, BuiltPackage>) {
    const log_context = Logger.enterContext('doBuild');
    const images_involved = new Set<image_name>();
    for (const pkg of requirements.values()) {
        images_involved.add(pkg.buildImage());
    }

    var ordered: BuiltPackage[] = [];

    try {
        for (const image of images_involved) {
            const image_reqs = await prepareImage(image);
            ordered.push(...await orderPackageSet(image_reqs, (status) => tui.setState({ planStatus: status })));
        }

        ordered.push(...await orderPackageSet(Array.from(requirements.values()), (status) => tui.setState({ planStatus: status })));
        ordered = await filterExistingBuilds(ordered);
        Logger.log(log_context, "----- Plan: -----");
        for (const build of ordered) {
            Logger.log(log_context, build._prettyPrint());
        }
    } catch (e) {
        if (e instanceof Error) {
            tui.setState({
                planStatus: {
                    resolved: 0, remaining: 0, currently_working_on: "", done: true, failed: e.toString() + e.stack
                }
            });
        }
        return;
    }

    if(program.dryRun) return;

    Logger.log(log_context, "-----------------");
    // Yes, we're mostly ignoring the ordering from orderPackageSet, but it's still
    // important to the UX and dependency resolution stuff, so it's gonna stick around.
    const targets: string[] = program.remotes.split(",");
    const mutices = new Map<string, Mutex>();
    targets.forEach(x => mutices.set(x, new Mutex()));

    const cancellations = new Set<string>();
    const currently_running = new Map<string, BuiltPackage>();
    targets.forEach(t => currently_running.set(t, undefined));
    const completions: BuiltPackage[] = [];

    const pending = new Set<BuiltPackage>(ordered);
    while (pending.size) {
        const runnable: BuiltPackage[] = [];
        for (const candidate of pending.values()) {
            const prerequisites = Array.from((await candidate.buildDependencies()).values()).filter(x => x instanceof BuiltPackage);
            if (!allBuiltPackages(prerequisites)) throw new Error("huh?");
            if (prerequisites.some(x => x.failed())) {
                Logger.log(log_context, `Not building ${candidate._prettyPrint()} as some of its dependencies have failed`);
                pending.delete(candidate);
                candidate.markFailed(FailureType.not_built);
                completions.push(candidate);
                tui.updateBuildState(completions, currently_running, pending, runnable, ordered.length);
            } else {
                const results: boolean[] = await Promise.all(prerequisites.map(x => x.alreadyDone()));
                if (results.every(x => x)) {
                    Logger.log(log_context, `[controller] Runnable: ${candidate._prettyPrint()}`);
                    runnable.push(candidate);
                }
            }
        }
        tui.updateBuildState(completions, currently_running, pending, runnable, ordered.length);
        for (const candidate of runnable) {
            const prerequisites = Array.from((await candidate.buildDependencies()).values()).filter(x => x instanceof BuiltPackage);
            if (!allBuiltPackages(prerequisites)) throw new Error("huh?");

            const cancel_uuid = uuid.v4();
            const promises = Array.from(mutices.entries()).map(async ([target, mutex]) => {
                // Attempt to acquire our mutex.
                const release = await mutex.acquire();
                // We are now in a critical section. If we await here, someone else might _also_ acquire their mutex, and we have a problem.
                // Check if someone else got theirs first.
                if (cancellations.has(cancel_uuid)) {
                    // Someone got to a target first. Just release the lock immediately.
                    // It's OK that we don't return anything here because we *can't* get to this place
                    // unless another promise has already resolved, so it won't be the winner in
                    // the Promise.race call.
                    release();
                } else {
                    // Tell everyone else off.
                    pending.delete(candidate);
                    cancellations.add(cancel_uuid);
                    // We're now out of the critical section.
                    return { target: target, release: release };
                }
            });
            const target = await Promise.race(promises);
            Logger.log(log_context, `[controller] \x1b[1mRunning: ${candidate._prettyPrint()} on ${target.target}\x1b[0m`);
            currently_running.set(target.target, candidate);
            tui.updateBuildState(completions, currently_running, pending, runnable, ordered.length);
            candidate.run(target.target == 'localhost' ? undefined : target.target)
                .then(() => {
                    Logger.log(log_context, `[controller] \x1b[1mCompleted: ${candidate._prettyPrint()} on ${target.target}\x1b[0m`);
                }).catch((e) => {
                    Logger.log(log_context, `[controller] \x1b[1mFailed: ${candidate._prettyPrint()} on ${target.target} (${e})\x1b[0m`);
                    process.exitCode = 1;
                    candidate.markFailed(FailureType.failed);
                }).then(() => {
                    completions.push(candidate);
                    currently_running.set(target.target, undefined);
                    tui.updateBuildState(completions, currently_running, pending, runnable, ordered.length);
                    target.release();
                });
        }
        // wait a bit to not thrash the disk by way of BuiltPackage.alreadyDone()
        await new Promise((resolve, reject) => setTimeout(resolve, 10000));
    }
    Logger.log(log_context, '[controller] All build tasks dispatched.');
}

function child_of(log_tree: Map<string, string>, parent: string, child: string): boolean {
    var current = child;
    while(current) {
        if(current == parent) return true;
        current = log_tree.get(current);
    }
    return false;
}

async function findLogs(tui: TUI, parent_id: string) {
    const log_tree = new Map<string, string>();
    const lines: LogLines = {
        rels: log_tree,
        lines: []
    };
    var current_root: string;

    const reader = readline.createInterface({
        input: fs.createReadStream(Logger.detailed_log),
        output: process.stdout,
        terminal: false
    });

    reader.on('line', function(s) {
        const line: LogLine = JSON.parse(s);
        if(line.type == 'startup') {
            log_tree.clear();
            log_tree.set(line.context.uuid, undefined);
            current_root = line.context.uuid;
        } else if(line.type == 'enter_context') {
            log_tree.set(line.context.uuid, line.context.parent || current_root);
        } else if(child_of(log_tree, parent_id, line.context.uuid)) {
            lines.lines.push(line);
            tui.updateLogState(lines);
        }
    });
}

var db_built = false;
async function build_db(tui: TUI): Promise<boolean> {
    if(db_built) return true;

    var rc = true;
    tui.setState({ buildingDatabase: "working" })
    try {
        await RPMDatabase.rebuild();
        tui.setState({ buildingDatabase: "complete" });
    } catch(e) {
        tui.setState({ buildingDatabase: "failed: " + e.toString() });
        rc = false;
    }

    db_built = true;
    return rc;
}

export async function main(tui: TUI) {
    var mode = "build";
    const requirements = new Map<string, BuiltPackage>();

    while (program.args.length) {
        const command = program.args.shift();
        if (command == 'rebuild-image' || command == 'build-image') {
            const image = program.args.shift();
            if (command == 'rebuild-image') Config.ignoredExistingImages.add(image);
            combine(requirements, await prepareImage(image));
        } else if (command == 'rebuild-package' || command == 'build-package') {
            const [pkg, image = Config.get().default_image] = program.args.shift().split(":");
            if(!await build_db(tui)) return;
            const action = new BuiltPackage(pkg, image);
            if (command == 'rebuild-package') Config.ignoredExistingPackages.add(`${action.spec.spec}:${action.spec.profile}`);
            requirements.set(action.hash(), action);
        } else if (command == 'rebuild-packages') {
            if(!await build_db(tui)) return;
            for (const arg of program.args) {
                const [pkg, image = Config.get().default_image] = arg.split(":");
                const action = new BuiltPackage(pkg, image);
                Config.ignoredExistingPackages.add(`${action.spec.spec}:${action.spec.profile}`);
                requirements.set(action.hash(), action);
            }
        } else if (command == 'build-all') {
            if(!await build_db(tui)) return;
            const image = program.args.shift() || Config.get().default_image;
            const dist = Config.get().build_images[image].installs_from;
            const names = Array.from(RPMDatabase.dist_name_to_version.get(dist).keys());
            const pkgs = names.map(x => new BuiltPackage(x, image));
            combine(requirements, pkgs);
        } else if (command == 'check-updates') {
            mode = "update";
            break;
        } else if (command == 'show-log') {
            mode = "log";
            break;
        }
    }
    
    if (mode == "build") {
        await doBuild(tui, requirements);
    } else if(mode == "log") {
        await findLogs(tui, program.args.shift());
    } else {
        await Updater.run(tui, program.args);
    }
}

program.option(
    '-r, --remotes <machine[,machine...]>',
    "List of machines to use for builds. All non-localhost machines need rsync, podman, and buildah installed.",
    "localhost");
program.option(
    '--dry-run',
    "Stop after the planning stage.",
    false
);

program.parse();

ink.render(<TUI />);