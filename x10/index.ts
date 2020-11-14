import { Action, MultipleInstallAction, PackageInstallAction } from "./Action";
import { Container } from "./Container";
import { Logger } from "./Logger";
import { RPMDatabase } from "./RPMDatabase";

async function main() {
    await RPMDatabase.rebuild();

    const container = new Container('digi2');
    const action = new PackageInstallAction('base-system', container);
    console.log(action);

    const ordered = await action.traverse();
    const combined: Action[] = [];
    var current: MultipleInstallAction;

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