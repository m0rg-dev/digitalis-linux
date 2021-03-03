#!/usr/bin/env -S node --enable-source-maps

import { Package } from "./package";

async function instantiate<T extends Package>(path: string): Promise<T> {
    const clazz = await import(`./${path}`);
    const pkg = new clazz.default;
    pkg._init();
    console.log(pkg);
    return pkg;
}

async function main() {
    const [, , cmd, ...args] = process.argv;

    if(cmd == 'prefetch') {
        const pkg = await instantiate(args.shift());
        await pkg.fetchSources();
    } else if(cmd == 'build') {
        const pkg = await instantiate(args.shift());
        await pkg.build();
    }
}

main();
