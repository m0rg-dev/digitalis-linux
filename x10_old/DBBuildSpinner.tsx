import * as ink from 'ink';
import Spinner from 'ink-spinner';
import * as React from "react";


export class DBBuildSpinner extends React.Component<{ state: string; }, {}> {
    render() {
        if (this.props.state == 'working') {
            return <ink.Text><ink.Text color="green"><Spinner /></ink.Text>{' Building RPM database'}</ink.Text>;
        } else if(this.props.state == 'complete') {
            return <ink.Static items={[true]}>
                {() => (<ink.Box key="db">
                    <ink.Text><ink.Text color="green">✔</ink.Text>{' Built RPM database'}</ink.Text>
                </ink.Box>
                )}
            </ink.Static>;
        } else {
            return <ink.Static items={[true]}>
                {() => (<ink.Box key="db">
                    <ink.Text><ink.Text color="red">✘</ink.Text>{' RPM database build ' + this.props.state}</ink.Text>
                </ink.Box>
                )}
            </ink.Static>;            
        }
    }
}
