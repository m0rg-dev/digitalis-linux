import { ChildProcess } from "child_process";
import * as fs from "fs";
import * as uuid from "uuid";

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
};

export type LoggerCallback = (level: LogLevel, message: string) => void;

export type LogContext = {
    name: string,
    uuid: string,
    parent?: string
};

export type LogLine = {
    type: string,
    context: LogContext,
    uuid: string,
    message?: string
}

export class Logger {
    static detailed_log = "/tmp/x10.log";
    static debug_to_console = false;
    static status_line = "";
    static logConsumers = new Set<LoggerCallback>();

    static enterContext(name: string, parent?: string): LogContext {
        const ctx: LogContext = {
            name: name,
            uuid: uuid.v4(),
            parent: parent
        };
        Logger.log_raw({ uuid: uuid.v4(), type: "enter_context", context: ctx });
        return ctx;
    }

    static fallback_context: LogContext = { name: "[no context]", uuid: uuid.v4() };

    static startup() {
        Logger.log_raw({ uuid: uuid.v4(), type: "startup", context: Logger.fallback_context });
    }

    static log(context: LogContext | null, message: string) {
        if (!context) {
            context = Logger.fallback_context;
        }
        message = message.trimEnd();
        let s = "";
        for (const line of message.split('\n')) {
            Logger.log_raw({ uuid: uuid.v4(), type: "message", context: context, message: message });
        }
    }

    private static log_raw(message: LogLine) {
        let fd = fs.openSync(Logger.detailed_log, 'a');
        fs.writeSync(fd, JSON.stringify(message) + "\n");
        fs.closeSync(fd);
    }

    static logProcessOutput(context: LogContext, id: string, proc: ChildProcess, stderr_only = false, level = LogLevel.DEBUG) {
        const child_context = Logger.enterContext(id, context.uuid);
        Logger.log(child_context, `spawned: ${proc.spawnargs.map(x => JSON.stringify(x)).join(" ")}`);
        if (!stderr_only) {
            proc.stdout.on('data', (data) => {
                for (const line of data.toString().trimEnd().split('\n')) {
                    Logger.log(child_context, line);
                }
            });
        }
        proc.stderr.on('data', (data) => {
            for (const line of data.toString().trimEnd().split('\n')) {
                Logger.log(child_context, `[stderr] ${line}`);
            }
        });
    }

    static registerConsumer(consumer: LoggerCallback) {
        Logger.logConsumers.add(consumer);
    }

    static removeConsumer(consumer: LoggerCallback) {
        Logger.logConsumers.delete(consumer);
    }
}

Logger.startup();

//if (fs.existsSync(Logger.detailed_log)) fs.truncateSync(Logger.detailed_log, 0);
