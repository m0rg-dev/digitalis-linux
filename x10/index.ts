#!/usr/bin/env -S node --enable-source-maps

import { Config } from "./Config";
import { Package } from "./package";

async function instantiate<T extends Package>(path: string): Promise<T> {
    const clazz = await import(`./${path}`);
    const pkg = new clazz.default;
    await pkg._init();
    return pkg;
}

async function main() {
    const [cmd, ...args] = Config.parseFromArgv(process.argv);

    if(cmd == 'prefetch') {
        const pkg = await instantiate(args.shift());
        await pkg.fetchSources();
        console.error(`package hash is ${await pkg.hash()}`);
    } else if(cmd == 'build') {
        const pkg = await instantiate(args.shift());
        await pkg.build();
    } else if(cmd == 'link') {
        const pkg = await instantiate(args.shift());
        await pkg.link(args.shift());
    }
}

main();
