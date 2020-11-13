import * as fs from 'fs';
import * as yaml from 'yaml';

export class Config {
    static conf: any;
    static get() {
        if (!Config.conf) {
            Config.conf = yaml.parse(fs.readFileSync('config.yml').toString());
            console.log(Config.conf);
        }
        return Config.conf;
    }
}