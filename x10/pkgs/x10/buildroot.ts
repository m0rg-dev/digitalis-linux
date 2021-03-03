import * as pkg from "../../package";
import { ImpureDependency } from "../x10_meta/impure";

export default class Buildroot extends pkg.Package {
    meta = (): pkg.pkgmeta => ({
        name: "buildroot",
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
        new ImpureDependency('sh', ['/bin/sh']),
        new ImpureDependency('bash', ['/bin/bash']),
        new ImpureDependency('coreutils-minimal', [
            'cat', 'chmod', 'cut', 'cp', 'date', 'echo', 'expr', 'rm', 'mkdir',
            'false', 'true', 'uname', 'mv', 'rmdir', 'head'
        ].map((p) => `/usr/bin/${p}`)),
        new ImpureDependency('findutils', [
            '/usr/bin/grep', '/usr/bin/find', '/usr/bin/xargs'
        ])
    ];
}
