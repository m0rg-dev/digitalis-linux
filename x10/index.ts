import { Config } from "./Config";
import { Container, image_name } from "./Container";
import { Logger } from "./Logger";
import { BuiltPackage, Package } from "./Package";
import { package_name, RPMDatabase } from "./RPMDatabase";

import program = require('commander');

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
    for(const pkg of list) {
        if(!await pkg.alreadyDone()) r.push(pkg);
    }
    return r;
}

function allBuiltPackages(list: Package[]): list is BuiltPackage[] {
    return list.every(x => x instanceof BuiltPackage);
}

async function prepareImage(image: image_name): Promise<BuiltPackage[]> {
    if(await (new Container(image)).imagePresent()) return [];
    const pkgs: Package[] = await Promise.all(Config.get().build_images[image].install_packages
        .map((name: package_name) => Package.resolve(name, image))
    );
    if(!allBuiltPackages(pkgs)) throw new Error("oops");
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
                Logger.info(`Dispatched: ${pkg.name}:${pkg.installed_on} (${pending.size} remaining)`);
            }
        }
    }

    if (!allBuiltPackages(ordered)) throw new Error("huh?");

    return filterDuplicateBuilds(ordered);
}

function combine(map: Map<string, BuiltPackage>, list: BuiltPackage[]) { list.forEach(x => map.set(x.hash(), x)) }

async function main() {
    await RPMDatabase.rebuild();

    const requirements = new Map<string, BuiltPackage>();

    while (process.argv.length) {
        const command = process.argv.shift();
        if(command == 'rebuild-image' || command == 'build-image') {
            const image = process.argv.shift();
            if(command == 'rebuild-image') Config.ignoredExistingImages.add(image);
            combine(requirements, await prepareImage(image));
        } else if(command == 'rebuild-package' || command == 'build-package') {
            const pkg = process.argv.shift();
            const image = process.argv.shift();
            const action = new BuiltPackage(pkg, image);
            if(command == 'rebuild-package') Config.ignoredExistingPackages.add(`${action.spec.spec}:${action.spec.profile}`);
            requirements.set(action.hash(), action);
        } else if(command == 'build-all') {
            const image = process.argv.shift();
            const dist = Config.get().build_images[image].installs_from;
            const names = Array.from(RPMDatabase.dist_name_to_version.get(dist).keys());
            const pkgs = names.map(x => new BuiltPackage(x, image));
            combine(requirements, pkgs);
        }
    }

    const images_involved = new Set<image_name>();
    for(const pkg of requirements.values()) {
        images_involved.add(pkg.buildImage());
    }

    var ordered: BuiltPackage[] = [];

    for(const image of images_involved) {
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
    for (const build of ordered) {
        await build.run();
    }
}

main().catch(e => console.error(e));
