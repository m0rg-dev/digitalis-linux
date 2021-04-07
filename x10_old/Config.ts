export enum ResolutionMode {
    /* EXACT: Packages may not be linked unless their hash matches the repository. */
    EXACT,
    /* LATEST: Packages may not be linked unless their version matches the
    repository and their dependencies are available by hash. */
    LATEST
};

export type option = {
    short: string,
    long: string,
    handler: ((argument: string) => void),
    takes_argument?: boolean
};

export class Config {
    static resolution: ResolutionMode = ResolutionMode.LATEST;

    static options: option[] = [
        {
            short: undefined, long: '--resolution', takes_argument: true, handler: (argument: string) => {
                if(argument.toLowerCase() == "exact") Config.resolution = ResolutionMode.EXACT;
                else if(argument.toLowerCase() == "latest") Config.resolution = ResolutionMode.LATEST;
                else throw new Error(`Unknown resolution mode ${argument}`);
            }
        }
    ];

    static parseFromArgv(argv = process.argv): string[] {
        const _argv = Array.from(argv.slice(2));
        const ret_args = [];
        while (_argv.length) {
            const arg = _argv.shift();
            if (arg == '--') {
                // -- ends processing
                ret_args.push(..._argv);
                break;
            } else if (arg.startsWith('-')) {
                if (arg.startsWith('--')) {
                    // long option
                    const split = arg.split("=", 2);
                    let option_name: string;
                    let option_arg: string;
                    if(split.length == 2) {
                        option_name = split[0];
                        option_arg = split[1];
                    } else {
                        option_name = split[0];
                        for(const opt of Config.options) {
                            if(opt.long == option_name && opt.takes_argument) {
                                option_arg = _argv.shift();
                                break;
                            }
                        }
                    }
                    for(const opt of Config.options) {
                        if(opt.long == option_name) opt.handler(option_arg);
                    }
                } else {

                }
            } else {
                ret_args.push(arg);
            }
        }

        return ret_args;
    }
};