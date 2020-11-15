import { ChildProcess } from "child_process";
import * as fs from "fs";

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
};

export class Logger {
    static detailed_log = "/tmp/x10.log";
    static debug_to_console = false;

    static _log(level: LogLevel, message: string) {
        message = message.trimEnd();
        let s = "";
        for (const line of message.split('\n')) {
            s += LogLevel[level].toString().padEnd(10) + " | " + line.trimEnd() + "\n";
        }

        if (level > LogLevel.DEBUG || Logger.debug_to_console) {
            process.stderr.write(s);
        }
        let fd = fs.openSync(Logger.detailed_log, 'a');
        fs.writeSync(fd, s);
        fs.closeSync(fd);
    }

    static debug(message: string) { Logger._log(LogLevel.DEBUG, message); }
    static info(message: string) { Logger._log(LogLevel.INFO, message); }
    static warn(message: string) { Logger._log(LogLevel.WARN, message); }
    static error(message: string) { Logger._log(LogLevel.ERROR, message); }

    static logProcessOutput(id: string, proc: ChildProcess, level = LogLevel.DEBUG) {
        proc.stdout.on('data', (data) => {
            for(const line of data.toString().trimEnd().split('\n')) {
                Logger._log(level, `[${id}] ${line}`);
            }
        });
        proc.stderr.on('data', (data) => {
            for(const line of data.toString().trimEnd().split('\n')) {
                Logger._log(level, `[${id} stderr] ${line}`);
            }
        });
    }
}

if(fs.existsSync(Logger.detailed_log)) fs.truncateSync(Logger.detailed_log, 0);
