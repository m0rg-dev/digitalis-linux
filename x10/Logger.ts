import { ChildProcess } from "child_process";
import * as fs from "fs";
import strip_ansi from 'strip-ansi';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
};

export type LoggerCallback = (level: LogLevel, message: string) => void;

export class Logger {
    static detailed_log = "/tmp/x10.log";
    static debug_to_console = false;
    static status_line = "";
    static logConsumers = new Set<LoggerCallback>();

    static _log(level: LogLevel, message: string) {
        message = message.trimEnd();
        let s = "";
        for (const line of message.split('\n')) {
            s += LogLevel[level].toString().padEnd(10) + " | " + line.trimEnd() + "\n";
            Logger.logConsumers.forEach(x => x(level, line.trimEnd()));
        }

        if (level > LogLevel.DEBUG || Logger.debug_to_console) {
            //process.stderr.write("\x1b[K" + s);
            //process.stderr.write("\x1b[K  " + Logger.status_line + "\r");
        }
        let fd = fs.openSync(Logger.detailed_log, 'a');
        fs.writeSync(fd, strip_ansi(s));
        fs.closeSync(fd);
    }

    static setStatus(status_line: string) {
        Logger.status_line = status_line;
        //process.stderr.write("\x1b[K  " + Logger.status_line + "\r");
    }

    static debug(message: string) { Logger._log(LogLevel.DEBUG, message); }
    static info(message: string) { Logger._log(LogLevel.INFO, message); }
    static warn(message: string) { Logger._log(LogLevel.WARN, message); }
    static error(message: string) { Logger._log(LogLevel.ERROR, message); }

    static logProcessOutput(id: string, proc: ChildProcess, stderr_only = false, level = LogLevel.DEBUG) {
        if (!stderr_only) {
            proc.stdout.on('data', (data) => {
                for (const line of data.toString().trimEnd().split('\n')) {
                    Logger._log(level, `[${id}] ${line}`);
                }
            });
        }
        proc.stderr.on('data', (data) => {
            for (const line of data.toString().trimEnd().split('\n')) {
                Logger._log(level, `[${id} stderr] ${line}`);
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

if (fs.existsSync(Logger.detailed_log)) fs.truncateSync(Logger.detailed_log, 0);
