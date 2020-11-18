import * as React from "react";
import * as ink from 'ink';
import Spinner from 'ink-spinner';
import { UpdateResult } from "./Updater";

export type UpdateProgress = {
    complete: UpdateResult[],
    currently_running: string | null
};

export class UpdateStatic extends React.Component<{ progress: UpdateProgress }> {
    render() {
        return <ink.Static items={this.props.progress.complete}>
            {completion => {
                if (completion.error) {
                    return <ink.Box key={completion.spec}>
                        <ink.Text><ink.Text color="red">✘</ink.Text> Check failed: {completion.spec}: {completion.error}.</ink.Text>
                    </ink.Box>;
                } else if (completion.new_version) {
                    return <ink.Box key={completion.spec}>
                        <ink.Text><ink.Text color="cyan" bold={true}>!</ink.Text> Have new version: {completion.new_version} for {completion.spec}.</ink.Text>
                    </ink.Box>;
                } else if (completion.skipped) {
                    return <ink.Box key={completion.spec}>
                        <ink.Text><ink.Text color="yellow" bold={true}>?</ink.Text> Not checked: {completion.spec}.</ink.Text>
                    </ink.Box>;
                } else {
                    return <ink.Box key={completion.spec}>
                        <ink.Text><ink.Text color="green">✔</ink.Text> Up to date: {completion.spec}</ink.Text>
                    </ink.Box>;
                }
            }}
        </ink.Static>;
    }
}

export class UpdateInfo extends React.Component<{ progress: UpdateProgress }> {
    render() {
        return <>
            <UpdateStatic progress={this.props.progress} />
            <ink.Box>
                {this.props.progress.currently_running && <ink.Text><ink.Text color="green"><Spinner /></ink.Text>{` Checking: ${this.props.progress.currently_running}`}</ink.Text>}
            </ink.Box>
        </>
    }
}