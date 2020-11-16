import { Config } from "./Config";
import { Container, image_name } from "./Container";
import { Logger } from "./Logger";
import { BuiltPackage, Package } from "./Package";
import { package_name, RPMDatabase } from "./RPMDatabase";

import program = require('commander');
import uuid = require('uuid');
import { Mutex } from "async-mutex";

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
    if (await (new Container(image)).imagePresent()) return [];
    const pkgs: Package[] = await Promise.all(Config.get().build_images[image].install_packages
        .map((name: package_name) => Package.resolve(name, image))
    );
    if (!allBuiltPackages(pkgs)) throw new Error("oops");
    return pkgs;
}

async function orderPackageSet(packages: Package[]): Promise<BuiltPackage[]> {
    const dispatched = new Map<string, Package>();
    const ordered: Package[] = [];
    const pending = new Map<string, Package>();

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
                Logger.debug(`Dispatched: ${pkg.name}:${pkg.installed_on} (${pending.size} remaining)`);
                Logger.setStatus(`Planning... ${pending.size} remaining (${pkg.name}:${pkg.installed_on})`);
            }
        }
    }

    if (!allBuiltPackages(ordered)) throw new Error("huh?");

    return filterDuplicateBuilds(ordered);
}

function combine(map: Map<string, BuiltPackage>, list: BuiltPackage[]) { list.forEach(x => map.set(x.hash(), x)) }
function update_status(currently_running: Map<string, string>, remaining: number) {
    Logger.setStatus(`${remaining} remaining - ` + Array.from(currently_running.keys()).sort().map(key => `\x1b[1m${key}\x1b[0m: ${currently_running.get(key)}`).join(" "));
}

async function main() {
    await RPMDatabase.rebuild();

    const requirements = new Map<string, BuiltPackage>();

    while (program.args.length) {
        const command = program.args.shift();
        if (command == 'rebuild-image' || command == 'build-image') {
            const image = program.args.shift();
            if (command == 'rebuild-image') Config.ignoredExistingImages.add(image);
            combine(requirements, await prepareImage(image));
        } else if (command == 'rebuild-package' || command == 'build-package') {
            const pkg = program.args.shift();
            const image = program.args.shift();
            const action = new BuiltPackage(pkg, image);
            if (command == 'rebuild-package') Config.ignoredExistingPackages.add(`${action.spec.spec}:${action.spec.profile}`);
            requirements.set(action.hash(), action);
        } else if (command == 'build-all') {
            const image = program.args.shift();
            const dist = Config.get().build_images[image].installs_from;
            const names = Array.from(RPMDatabase.dist_name_to_version.get(dist).keys());
            const pkgs = names.map(x => new BuiltPackage(x, image));
            combine(requirements, pkgs);
        }
    }

    const images_involved = new Set<image_name>();
    for (const pkg of requirements.values()) {
        images_involved.add(pkg.buildImage());
    }

    var ordered: BuiltPackage[] = [];
    Logger.setStatus(`Planning... `);

    for (const image of images_involved) {
        const image_reqs = await prepareImage(image);
        ordered.push(...await orderPackageSet(image_reqs));
    }

    ordered.push(...await orderPackageSet(Array.from(requirements.values())));
    ordered = await filterExistingBuilds(ordered);
    Logger.info("----- Plan: -----");
    for (const build of ordered) {
        Logger.info(build._prettyPrint());
    }

    Logger.info("-----------------");
    // Yes, we're mostly ignoring the ordering from orderPackageSet, but it's still
    // important to the UX and dependency resolution stuff, so it's gonna stick around.
    const targets: string[] = program.remotes.split(",");
    const mutices = new Map<string, Mutex>();
    targets.forEach(x => mutices.set(x, new Mutex()));

    const cancellations = new Set<string>();
    const currently_running = new Map<string, string>();

    const pending = new Set<BuiltPackage>(ordered);
    while (pending.size) {
        update_status(currently_running, pending.size);
        for (const candidate of pending.values()) {
            const prerequisites = Array.from((await candidate.buildDependencies()).values()).filter(x => x instanceof BuiltPackage);
            if (!allBuiltPackages(prerequisites)) throw new Error("huh?");
            const results: boolean[] = await Promise.all(prerequisites.map(x => x.alreadyDone()));
            if (results.every(x => x)) {
                Logger.info(`[controller] Runnable: ${candidate._prettyPrint()}`);
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
                Logger.info(`[controller] \x1b[1mRunning: ${candidate._prettyPrint()} on ${target.target}\x1b[0m`);
                currently_running.set(target.target, candidate.name);
                update_status(currently_running, pending.size);
                candidate.run(target.target == 'localhost' ? undefined : target.target)
                    .then(() => {
                        Logger.info(`[controller] \x1b[1mCompleted: ${candidate._prettyPrint()} on ${target.target}\x1b[0m`);
                        currently_running.set(target.target, "<none>");
                        update_status(currently_running, pending.size);
                        target.release();
                    });
            }
        }
        // wait a bit to not thrash the disk by way of BuiltPackage.alreadyDone()
        await new Promise((resolve, reject) => setTimeout(resolve, 10000));
    }
    Logger.info('[controller] All build tasks dispatched.');
}

program.option(
    '-r, --remotes <machine[,machine...]>',
    "List of machines to use for builds. All non-localhost machines need rsync, podman, and buildah installed.",
    "localhost");

program.parse();

main().catch(e => console.error(e));
