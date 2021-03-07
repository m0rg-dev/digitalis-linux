#!/usr/bin/env -S node --enable-source-maps --unhandled-rejections=strict

import { Config } from "./Config";
import Logger from "./Logger";
import { Package } from "./Package";
import Spec from "./Spec";

async function instantiate<T extends Spec>(path: string): Promise<T> {
    const clazz = await import(`./${path}`);
    const pkg = new clazz.default;
    return pkg;
}

async function main() {
    const [cmd, ...args] = Config.parseFromArgv(process.argv);

    /*if(cmd == 'prefetch') {
        const pkg = await instantiate(args.shift());
        await pkg.fetchSources();
        console.error(`package hash is ${await pkg.hash()}`);
    } else if(cmd == 'build') {
        const pkg = await instantiate(args.shift());
        await pkg.build();
    } else if(cmd == 'link') {
        const pkg = await instantiate(args.shift());
        await pkg.link(args.shift());
    }*/

    Logger.enable('info');

    if(cmd == 'instantiate') {
    } else if(cmd == 'build') {
        const spec = await instantiate(args.shift());
        console.log(await (new Package(spec).build()));
    }
}

main();
