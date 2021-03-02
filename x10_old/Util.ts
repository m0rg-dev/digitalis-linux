import child_process = require('child_process');

export class Util {
    static async waitForProcess(proc: child_process.ChildProcess) {
        return new Promise((resolve, reject) => {
            proc.on('close', (code, signal) => {
                if (signal) reject(`Subprocess killed by signal ${signal}`);
                if (code) reject(`Subprocess exited with code ${code}`);
                resolve();
            });
        });
    }
}