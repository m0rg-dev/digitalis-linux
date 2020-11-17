import * as React from "react";
import * as ink from 'ink';
import { Logger, LogLevel } from "./Logger";

type LogWindowState = {
    messages: { level: LogLevel; message: string; }[];
};

type LogWindowProps = {
    height: number;
}

type LogLineProps = {
    key: string;
    level: LogLevel;
    message: string;
}

class LogLine extends React.Component<LogLineProps, {}> {
    constructor(props: LogLineProps | Readonly<LogLineProps>) {
        super(props);
    }

    render() {
        return (
            <ink.Text><ink.Text>{this.props.message}</ink.Text><ink.Newline /></ink.Text>
        )
    }
}

export class LogWindow extends React.Component<LogWindowProps, LogWindowState> {
    updateCallback: (level: LogLevel, message: string) => void;

    constructor(props: LogWindowProps | Readonly<LogWindowProps>) {
        super(props);
        this.state = {
            messages: []
        };
    }

    componentDidMount() {
        this.updateCallback = (x, y) => this.update(x, y);
        Logger.registerConsumer(this.updateCallback);
    }

    componentWillUnmount() {
        Logger.removeConsumer(this.updateCallback);
    }

    update(level: LogLevel, message: string) {
        this.setState((state, props) => ({ messages: [...state.messages, { level: level, message: message }] }));
    }

    messagesToList() {
        return this.state.messages.filter(x => x.level > LogLevel.DEBUG).slice(-(this.props.height - 2));
    }

    render() {
        return (
            <ink.Box borderStyle="round" height={this.props.height}>
                {this.messagesToList().map((x, index) => <LogLine level={x.level} message={x.message} key={index.toString()} />)}
            </ink.Box>
        );
    }
}
