import { Action, EnsureImageAction, MultipleInstallAction, PackageBuildAction, PackageInstallAction } from "./Action";
import { Container } from "./Container";
import { Logger } from "./Logger";
import { RPMDatabase } from "./RPMDatabase";

async function pruneExistingBuilds(list: Action[]): Promise<Action[]> {
    Logger.debug(`in pruneExistingBuilds`);
    const r: Action[] = [];
    for (const a of list) {
        if (a instanceof PackageBuildAction) {
            if (await a.haveArtifacts()) {
                await a.prune();
            }
        }
        r.push(a);
    }
    Logger.debug(`out pruneExistingBuilds`);
    return r;
}

async function filterPrunedActions(list: Action[]): Promise<Action[]> {
    return list.filter(a => !a.pruned);
}

async function main() {
    await RPMDatabase.rebuild();

    const container = new Container('digi2');
    //const action = new PackageInstallAction('bash', container);

    const action = new EnsureImageAction(container);
    //const action = new PackageBuildAction('../rpmbuild/SPECS/createrepo_c.spec', container, 'digi2');
    //const container = new Container('fc33');
    //const action = new PackageInstallAction('x86_64-pc-linux-gnu-gcc', container);
    console.log(action);
    console.log(await action.prerequisites());
    // console.log(await build.prerequisites());
    // for (const r of await build.prerequisites()) {
    //     if (r instanceof PackageInstallAction) {
    //         try {
    //             const i2 = new PackageInstallAction(r.what, container);
    //             console.log((await i2.prerequisites()).filter(x => x instanceof PackageInstallAction));
    //         } catch (e) {
    //             Logger.info(`Can't install ${r.what} on ${container} - ${e}`);
    //         }
    //     }
    // }

    // if (process.pid > 0) throw 'h';

    const ordered = await action.traverse()
        .then(list => pruneExistingBuilds(list))
        .then(list => filterPrunedActions(list));
    const combined: Action[] = [];
    var current: MultipleInstallAction;

    const built_images = new Set<string>();

    for (const a of ordered) {
        Logger.info(a.toString());
        if (a instanceof PackageInstallAction) {
            if (!current) {
                current = new MultipleInstallAction();
            }
            if (current.compatible(a)) {
                await current.add(a);
            } else {
                combined.push(current);
                current = new MultipleInstallAction();
                current.add(a);
            }
        } else if (a instanceof EnsureImageAction) {
            if (built_images.has(a.where.image_name())) continue;
            built_images.add(a.where.image_name());
            combined.push(a);
        } else {
            if (current) combined.push(current);
            combined.push(a);
            current = undefined;
        }
    }
    Logger.info('---------');
    for (const a of combined) {
        Logger.info(a.toString());
    }
    Logger.info('---------');
    for (const a of combined) {
        await a.execute();
    }
}

try {
    main();
} catch (e) {
    console.error(e);
}