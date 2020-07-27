export class Config {
    private static singleton: Config

    private use_default_depends: boolean;

    private constructor() {
        this.use_default_depends = true;
    }

    private static s(): Config {
        if(Config.singleton) return Config.singleton;
        return Config.singleton = new Config();
    }

    static setConfigKey(key: string, value: any) {
        Config.s()[key] = value;
    }

    static getConfigKey(key: string): any {
        return Config.s()[key];
    }
}