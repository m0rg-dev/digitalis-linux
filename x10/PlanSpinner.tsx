import * as ink from 'ink';
import Spinner from 'ink-spinner';
import * as React from "react";


export type PlanProgress = {
    resolved: number;
    remaining: number;
    currently_working_on: string;
    done: boolean;
    failed?: string
};

export class PlanSpinner extends React.Component<{ progress: PlanProgress; }, {}> {
    render() {
        if (this.props.progress.done) {
            if (this.props.progress.failed) {
                return <ink.Box flexDirection="column">
                    <ink.Text><ink.Text color="red">✘</ink.Text>{` Plan failed.`}</ink.Text>
                    <ink.Text>{this.props.progress.failed}</ink.Text>
                </ink.Box>;
            } else {
                return <ink.Static items={[true]}>
                    {() => (<ink.Box key="plan">
                        <ink.Text><ink.Text color="green">✔</ink.Text>{` Plan complete: ${this.props.progress.resolved} packages`}</ink.Text>
                    </ink.Box>
                    )}
                </ink.Static>;
            }
        } else {
            return <ink.Text>
                <ink.Text color="green"><Spinner /></ink.Text>
                {` Planning: ${this.props.progress.resolved} of ${this.props.progress.resolved + this.props.progress.remaining} (${this.props.progress.currently_working_on})`}
            </ink.Text>;
        }
    }
}
