import { Action, PackageBuildAction, PackageInstallAction } from "./Action";
import { Config } from "./Config";
import { RPMDatabase } from "./RPMDatabase";
import * as fs from "fs";
import * as uuid from "uuid";
import { Logger } from "./Logger";
import { RPMDependency } from "./Dependency";

let actions: Map<string, Action> = new Map();

async function main() {
    await Config.read_config();
    if (!fs.existsSync("/tmp/dnfcache"))
        await fs.promises.mkdir("/tmp/dnfcache");

    const depend = new RPMDependency('base-system');
    const strategy = await (await Config.get()).build_targets['digi1'].can_install(depend);
    if (!strategy) throw new Error(`No install strategy for ${depend.name}!`);

    const action = new PackageInstallAction(depend, strategy, uuid.v4());

    actions.set(action.uuid, action);

    console.log(actions);

    while (actions.size) {
        let changed = false;
        for (const [uuid, action] of actions) {
            if (await action.necessary()) {
                const prerequisites = await action.prerequisites();
                if (prerequisites.length) {
                    Logger.info(`${action}: waiting ${prerequisites.length}`);
                    for (const a of prerequisites) {
                        Logger.info(`${action}:   ${a}`);
                        actions.set(a.uuid, a);
                        changed = true;
                    }
                } else {
                    Logger.info(`${action}: executing`);
                    await action.execute();
                    Logger.info(`${action}: done`);
                    actions.delete(uuid);
                    changed = true;
                }
            } else {
                Logger.info(`${action}: unnecessary`);
                actions.delete(uuid);
                changed = true;
            }
        }
        if (!changed) {
            throw new Error("No change happened during the last cycle, bailing out.");
        }
    }
}

try {
    main();
} catch (e) {
    console.error(e);
}