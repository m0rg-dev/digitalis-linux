import Spec, { BuildStep, pkgmeta } from '../Spec';
import ImpureSymlink from './ImpureSymlink';

export default class Bootstrap extends Spec {
    meta = (): pkgmeta => ({
        url: "",
        version: "0.1",
        release: 1,
        summary: "",
        license: "0BSD",
        workdir: () => this.root()
    });

    build_dependencies = () => [
        new ImpureSymlink('bin/curl', '/usr/bin/curl'),
        new ImpureSymlink('bin/tar', '/usr/bin/tar'),
        new ImpureSymlink('bin/gzip', '/usr/bin/gzip'),
    ];

    dependencies = () => [
        new ImpureSymlink('bin/sh', '/bin/sh'),
        ...[
            'curl', 'tar', 'gzip', 'xz', 'make', 'cat', 'chmod', 'cut', 'cp', 'date',
            'echo', 'expr', 'rm', 'mkdir', 'false', 'true', 'uname', 'mv', 'rmdir',
            'head', 'basename', 'sort', 'tr', 'install', 'ls', 'cmp', 'touch', 'ln',
            'tty', 'uniq', 'test', 'wc', 'sleep', 'gcc', 'sed', 'gawk', 'bison',
            'python3', 'ar', 'objdump', 'strip', 'as', 'ld', 'grep', 'fgrep', 'egrep',
            'find', 'xargs', 'bash', 'awk'
        ].map((x) => new ImpureSymlink(`bin/${x}`, `/usr/bin/${x}`))
    ];

    steps = (): { [key: string]: BuildStep } => ({
        "configure": undefined,
        "make": undefined,
        "install": undefined
    });
}