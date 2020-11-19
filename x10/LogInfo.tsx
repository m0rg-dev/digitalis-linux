import * as React from "react";
import * as ink from 'ink';
import { LogLine } from "./Logger";
import useStdoutDimensions from 'ink-use-stdout-dimensions';

export type LogLines = {
    rels: Map<string, string>,
    lines: LogLine[]
}

export class LogStatic extends React.Component<{ progress: LogLines }> {
    render() {
        return <ink.Static items={this.props.progress.lines.filter(line => line.type == "message")}>
            {line => {
                return <ink.Box key={line.uuid} width={Math.min(process.stdout.getWindowSize()[0], 250)}>
                    <ink.Box minWidth={line.context.name.length} height={1}><ink.Text color="gray">{line.context.name}</ink.Text></ink.Box>
                    <ink.Box paddingLeft={1}><ink.Text>{line.message}</ink.Text></ink.Box>
                </ink.Box>
            }}
        </ink.Static>;
    }
}

export class LogInfo extends React.Component<{ lines: LogLines }> {
    render() {
        return <>
            <LogStatic progress={this.props.lines} />
        </>
    }
}