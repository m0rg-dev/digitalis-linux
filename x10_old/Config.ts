import * as fs from 'fs';
import * as yaml from 'yaml';

export class Config {
    static conf: any;
    static ignoredExistingImages = new Set<string>();
    static ignoredExistingPackages = new Set<string>();
    
    static get() {
        if (!Config.conf) {
            Config.conf = yaml.parse(fs.readFileSync('config.yml').toString());
        }
        return Config.conf;
    }
}