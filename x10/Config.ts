export class Config {
    static use_default_depends: boolean = true;
    static build_container: string = 'digitalis-builder';
    static repository: string = '/var/lib/x10/repo';
    static without_hostdb: boolean = false;
    static verbose_output: boolean = false;
    static logging_config: string = '';
}