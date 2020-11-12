import * as fs from "fs";
import * as yaml from "yaml";
import { BuildTarget } from "./BuildTarget";

export type BuildImage = {
    script?: string,
    install_strategy?: string,
    install_packages?: string[]
};

export class Config {
    rpm_option_sets: { [key: string]: string[] };
    build_targets: { [key: string]: BuildTarget; };
    build_images: { [key: string]: BuildImage; };
    default_build_target: string;

    static singleton: Config;

    static async get(): Promise<Config> {
        if(!Config.singleton) await Config.read_config();
        return Config.singleton;
    }

    static async read_config(): Promise<void> {
        return fs.promises.readFile("config.yml")
            .then((data) => {
                const temp_config = yaml.parse(data.toString());
                Config.singleton = {
                    rpm_option_sets: temp_config.rpm_option_sets,
                    build_targets: {},
                    build_images: undefined,
                    default_build_target: undefined
                };
                for (const key in temp_config.build_targets) {
                    Config.singleton.build_targets[key] = new BuildTarget(temp_config.build_targets[key], key);
                }
                Config.singleton.build_images = temp_config.build_images;
                Config.singleton.default_build_target = temp_config.default_build_target;
            });
    }
}
