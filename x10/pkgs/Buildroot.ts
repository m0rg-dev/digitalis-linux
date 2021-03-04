import * as pkg from "../package";
import Bash from "./Bash";
import Coreutils from "./Coreutils";
import Findutils from "./Findutils";
import Glibc from "./Glibc";
import { ImpureDependency } from "./impure";

export class BootstrapBuildroot extends pkg.Package {
    meta = (): pkg.pkgmeta => ({
        url: "",
        version: "0.1",
        release: 1,
        summary: "",
        license: "0BSD"
    });

    srcs = (): pkg.pkgsrc[] => [];

    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "configure": undefined,
        "make": undefined,
        "install": undefined
    });

    link_import = (): pkg.Package[] => [
        new ImpureDependency('gcc', ['/usr/bin/gcc']),
        new ImpureDependency('make', ['/usr/bin/make']),
        new ImpureDependency('tar', ['/usr/bin/tar']),
        new ImpureDependency('gzip', ['/usr/bin/gzip']),
        new ImpureDependency('xz', ['/usr/bin/xz']),
        new ImpureDependency('sed', ['/usr/bin/sed']),
        new ImpureDependency('gawk', ['/usr/bin/awk', '/usr/bin/gawk']),
        new ImpureDependency('bison', ['/usr/bin/bison']),
        new ImpureDependency('curl', ['/usr/bin/curl']),
        new ImpureDependency('python3', ['/usr/bin/python3']),
        new ImpureDependency('bash', ['/bin/bash', '/bin/sh']),
        new ImpureDependency('binutils', ['/usr/bin/ar', '/usr/bin/objdump', '/usr/bin/strip', '/usr/bin/as', '/usr/bin/ld']),
        new ImpureDependency('coreutils', [
            'cat', 'chmod', 'cut', 'cp', 'date', 'echo', 'expr', 'rm', 'mkdir',
            'false', 'true', 'uname', 'mv', 'rmdir', 'head', 'basename', 'sort',
            'tr', 'install', 'ls', 'cmp', 'touch', 'ln', 'tty', 'uniq', 'test', 
            'wc', 'sleep'
        ].map((p) => `/usr/bin/${p}`)),
        new ImpureDependency('findutils', [
            '/usr/bin/grep', '/usr/bin/find', '/usr/bin/xargs', '/usr/bin/fgrep', '/usr/bin/egrep'
        ])
    ];
}

export default class Buildroot extends pkg.Package {
    meta = (): pkg.pkgmeta => ({
        url: "",
        version: "0.1",
        release: 1,
        summary: "",
        license: "0BSD"
    });

    srcs = (): pkg.pkgsrc[] => [];

    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "configure": undefined,
        "make": undefined,
        "install": undefined
    });

    link_import = (): pkg.Package[] => [
        /*
        new ImpureDependency('gcc', ['/usr/bin/gcc']),
        new ImpureDependency('make', ['/usr/bin/make']),
        new ImpureDependency('tar', ['/usr/bin/tar']),
        new ImpureDependency('gzip', ['/usr/bin/gzip']),
        new ImpureDependency('xz', ['/usr/bin/xz']),
        new ImpureDependency('sed', ['/usr/bin/sed']),
        new ImpureDependency('gawk', ['/usr/bin/awk', '/usr/bin/gawk']),
        new ImpureDependency('bison', ['/usr/bin/bison']),
        new ImpureDependency('python3', ['/usr/bin/python3']),
        new ImpureDependency('bash', ['/bin/bash', '/bin/sh']),
        new ImpureDependency('binutils', ['/usr/bin/ar', '/usr/bin/objdump', '/usr/bin/strip', '/usr/bin/as', '/usr/bin/ld']),
        new ImpureDependency('coreutils', [
            'cat', 'chmod', 'cut', 'cp', 'date', 'echo', 'expr', 'rm', 'mkdir',
            'false', 'true', 'uname', 'mv', 'rmdir', 'head', 'basename', 'sort',
            'tr', 'install', 'ls', 'cmp', 'touch', 'ln', 'tty', 'uniq', 'test', 
            'wc', 'sleep'
        ].map((p) => `/usr/bin/${p}`)),
        new ImpureDependency('findutils', [
            '/usr/bin/grep', '/usr/bin/find', '/usr/bin/xargs', '/usr/bin/fgrep', '/usr/bin/egrep'
        ])
        */
       new Glibc(),
       new Bash(),
       new Coreutils(),
       new Findutils()
    ];
}