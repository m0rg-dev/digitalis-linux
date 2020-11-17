import * as ink from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import * as React from "react";
import { BuiltPackage } from "./Package";


export type BuildProgress = {
    built: BuiltPackage[];
    currently_running: Map<string, BuiltPackage>;
    currently_runnable: BuiltPackage[];
    currently_not_runnable: BuiltPackage[];
    remaining: number;
    total: number;
};

export class BuildInfo extends React.Component<{ progress: BuildProgress; }, {}> {
    render() {
        if ([...this.props.progress.currently_running.values()].filter(x => x).length
            || this.props.progress.currently_runnable.length
            || this.props.progress.currently_not_runnable.length) {
            return <>
                <ink.Static items={this.props.progress.built}>
                    {completion => {
                        return <ink.Box key={completion.hash()}>
                            <ink.Text><ink.Text color="green">✔</ink.Text> Built: {completion.spec.spec} ({completion.name}) for {completion.installed_on}</ink.Text>
                        </ink.Box>;
                    }}
                </ink.Static>

                <ink.Box>
                    <ink.Box>
                        <ink.Box flexDirection="column">
                            {[...this.props.progress.currently_running.entries()].map(entry => {
                                const [k, v] = entry;
                                return <ink.Box key={k}>
                                    <ink.Text bold={true}>{k}</ink.Text>
                                </ink.Box>;
                            })}
                        </ink.Box>
                        <ink.Box flexDirection="column" marginLeft={1}>
                            {[...this.props.progress.currently_running.entries()].map(entry => {
                                const [k, v] = entry;
                                return <ink.Box key={k}>
                                    {v ? <ink.Text><Spinner type="line" /> {` building ${path.basename(v.spec.spec)} (${v.name})`}</ink.Text> : <ink.Text>{'   waiting...'}</ink.Text>}
                                </ink.Box>;
                            })}
                        </ink.Box>
                    </ink.Box>

                    <ink.Box flexDirection="column" marginLeft={5}>
                        {[
                            ...[...this.props.progress.currently_running.values()].filter(x => x).map(running => {
                                return <ink.Box key={running.hash()}>
                                    <ink.Text color="magenta">{running.name}</ink.Text>
                                </ink.Box>;
                            }),
                            ...this.props.progress.currently_runnable.map(running => {
                                return <ink.Box key={running.hash()}>
                                    <ink.Text color="green">{running.name}</ink.Text>
                                </ink.Box>;
                            }),
                            ...this.props.progress.currently_not_runnable.map(running => {
                                return <ink.Box key={running.hash()}>
                                    <ink.Text color="red">{running.name}</ink.Text>
                                </ink.Box>;
                            })
                        ].slice(0, 10)}
                    </ink.Box>
                </ink.Box>

                <ink.Box>
                    <ink.Text>{this.props.progress.built.length} / {this.props.progress.total} completed, {this.props.progress.remaining} not yet dispatched</ink.Text>
                </ink.Box>
            </>;
        } else {
            return <>
                <ink.Static items={this.props.progress.built}>
                    {completion => {
                        return <ink.Box key={completion.hash()}>
                            <ink.Text><ink.Text color="green">✔</ink.Text> Built: {completion.spec.spec} ({completion.name}) for {completion.installed_on}</ink.Text>
                        </ink.Box>;
                    }}
                </ink.Static>
                <ink.Text>All builds completed.</ink.Text>
            </>;
        }
    }
}
