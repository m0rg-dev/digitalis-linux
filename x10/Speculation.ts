import { Logger } from "./Logger";
import { spec_with_options } from "./RPMDatabase";

export class Speculation {
    private static dispatched_builds: Set<string> = new Set();

    static dispatch(what: spec_with_options) {
        Logger.info(`Dispatch: ${what.spec}-${what.profile}`)
        Speculation.dispatched_builds.add(`${what.spec}-${what.profile}`);
    }

    static isPending(what: spec_with_options): boolean {
        return Speculation.dispatched_builds.has(`${what.spec}-${what.profile}`);
    }
}