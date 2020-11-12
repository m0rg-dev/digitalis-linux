import * as fs from "fs";
import { Action, PackageInstallAction } from "./Action";
import { Config } from "./Config";
import { Logger } from "./Logger";
import { RPMDatabase } from "./RPMDatabase";

let actions: Map<string, Action> = new Map();

async function main() {
    await Config.read_config();
    if (!fs.existsSync("/tmp/dnfcache")) {
        await fs.promises.mkdir("/tmp/dnfcache");
    }

    const target = (await RPMDatabase.get()).lookup_rpm('digi1', 'base-system');
    console.log(target);

    const action = new PackageInstallAction({ name: target.as_string }, (await Config.get()).build_targets['digi1']);

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