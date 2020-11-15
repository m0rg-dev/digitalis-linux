import { Config } from "./Config";
import { Container, image_name } from "./Container";
import { Logger } from "./Logger";
import { BuiltPackage, Package } from "./Package";
import { package_name, RPMDatabase } from "./RPMDatabase";

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

function allBuiltPackages(list: Package[]): list is BuiltPackage[] {
    return list.every(x => x instanceof BuiltPackage);
}

async function prepareImage(image: image_name): Promise<BuiltPackage[]> {
    const pkgs: Package[] = await Promise.all(Config.get().build_images[image].install_packages
        .map((name: package_name) => Package.resolve(name, image))
    );
    return orderPackageSet(pkgs);
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
                Logger.info(`Dispatched: ${pkg.name} (${pending.size} remaining)`);
            }
        }
    }

    if (!allBuiltPackages(ordered)) throw new Error("huh?");

    return filterDuplicateBuilds(ordered);
}

async function main() {
    await RPMDatabase.rebuild();

    const ordered = await prepareImage('digitalis-stage1');

    //const pkg = new BuiltPackage('x86_64-pc-linux-gnu-gcc', 'fedora-with-rpm');
    //const ordered = await orderPackageSet([pkg]);
    Logger.info("----- Plan: -----");
    for (const build of ordered) {
        Logger.info(build._prettyPrint());
    }

    Logger.info("-----------------");
    for (const build of ordered) {
        await build.run();
    }

    await (new Container('digitalis-stage1')).ensure_image();

    const ordered_stage2 = await prepareImage('digitalis-stage2');

    Logger.info("----- Plan: -----");
    for (const build of ordered_stage2) {
        Logger.info(build._prettyPrint());
    }

    Logger.info("-----------------");
    for (const build of ordered_stage2) {
        await build.run();
    }

    await (new Container('digitalis-stage2')).ensure_image();
}

main().catch(e => console.error(e));
