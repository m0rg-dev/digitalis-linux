import { Action, PackageBuildAction } from "./Action";
import { Config } from "./Config";
import { RPMDatabase } from "./RPMDatabase";
import * as fs from "fs";
import { Logger } from "./Logger";

let actions: Map<string, Action> = new Map();

async function main() {
    await Config.read_config();
    if (!fs.existsSync("/tmp/dnfcache"))
        await fs.promises.mkdir("/tmp/dnfcache");

    const rpminfo = (await RPMDatabase.get()).lookup_rpm("fc33", "x86_64-pc-linux-gnu-gcc");
    const action = new PackageBuildAction(rpminfo);

    actions.set(action.uuid, action);

    console.log(actions);

    while (actions.size) {
        let changed = false;
        for (const [uuid, action] of actions) {
            if (action.necessary()) {
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

main();