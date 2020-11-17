import * as ink from 'ink';
import Spinner from 'ink-spinner';
import * as React from "react";


export class DBBuildSpinner extends React.Component<{ state: string; }, {}> {
    render() {
        if (this.props.state == 'working') {
            return <ink.Text><ink.Text color="green"><Spinner /></ink.Text>{' Building RPM database'}</ink.Text>;
        } else {
            return <ink.Static items={[true]}>
                {() => (<ink.Box key="db">
                    <ink.Text><ink.Text color="green">✔</ink.Text>{' Built RPM database'}</ink.Text>
                </ink.Box>
                )}
            </ink.Static>;
        }
    }
}
