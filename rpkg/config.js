"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
class Config {
    constructor() {
        this.use_default_depends = true;
    }
    static s() {
        if (Config.singleton)
            return Config.singleton;
        return Config.singleton = new Config();
    }
    static setConfigKey(key, value) {
        Config.s()[key] = value;
    }
    static getConfigKey(key) {
        return Config.s()[key];
    }
}
exports.Config = Config;
