import * as React from "react";
import { BuiltPackage } from "./Package";
import { main } from "./index";
import { DBBuildSpinner } from "./DBBuildSpinner";
import { PlanProgress, PlanSpinner } from "./PlanSpinner";
import { BuildProgress, BuildInfo } from "./BuildInfo";
import { UpdateInfo, UpdateProgress } from "./UpdateInfo";
import { UpdateResult } from "./Updater";
import { LogInfo, LogLines } from "./LogInfo";

type TUIState = {
    buildingDatabase: string | null;
    planStatus: PlanProgress | null;
    buildStatus: BuildProgress | null;
    updateStatus: UpdateProgress | null;
    logInfo: LogLines | null;
};
export class TUI extends React.Component<{}, TUIState> {
    constructor(props: {} | Readonly<{}>) {
        super(props);
        this.state = {
            buildingDatabase: undefined,
            planStatus: undefined,
            buildStatus: undefined,
            updateStatus: undefined,
            logInfo: undefined
        };
    }

    componentDidMount() {
        main(this);
    }

    updateBuildState(completions: BuiltPackage[], currently_running: Map<string, BuiltPackage>, pending: Set<BuiltPackage>, currently_runnable: BuiltPackage[], total: number) {
        this.setState({
            buildStatus: {
                built: [...completions],
                currently_running: currently_running,
                remaining: pending.size,
                currently_runnable: [...currently_runnable]
                    .filter(x => completions.every(y => y.hash() != x.hash()))
                    .filter(x => [...currently_running.values()].every(y => !y || y.hash() != x.hash())),
                currently_not_runnable: [...pending].filter(x => currently_runnable.every(y => y.hash() != x.hash())),
                total: total
            }
        });
    }

    updateUpdateState(completions: UpdateResult[], currently_running: string | null) {
        this.setState({
            updateStatus: {
                complete: [...completions],
                currently_running: currently_running
            }
        });
    }

    updateLogState(lines: LogLines) {
        this.setState({
            logInfo: {
                rels: lines.rels,
                lines: [...lines.lines]
            }
        });
    }

    render() {
        return <>
            {this.state.buildingDatabase && <DBBuildSpinner state={this.state.buildingDatabase} />}
            {this.state.planStatus && <PlanSpinner progress={this.state.planStatus} />}
            {this.state.buildStatus && <BuildInfo progress={this.state.buildStatus} />}
            {this.state.updateStatus && <UpdateInfo progress={this.state.updateStatus} />}
            {this.state.logInfo && <LogInfo lines={this.state.logInfo} />}
        </>;
    }
}
