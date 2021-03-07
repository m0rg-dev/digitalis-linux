import Spec, { AutoconfStep, BuildStep, GenericCommandStep, MergePathsStep, pkgmeta, pkgsrc } from '../Spec';
import Bootstrap from './Bootstrap';
import KernelHeaders from './KernelHeaders';

import * as path from 'path';

export default class Glibc extends Spec {
    meta = (): pkgmeta => ({
        url: "https://www.gnu.org/software/libc/",
        version: "2.33",
        release: 1,
        summary: "The GNU C Library",
        license: "LGPLv2+ and LGPLv2+ with exceptions and GPLv2+ and GPLv2+ with exceptions and BSD and Inner-Net and ISC and Public Domain and GFDL",
        workdir: () => `${this.root()}/build`
    });

    srcs = (): pkgsrc[] => [
        {
            url: `https://ftp.gnu.org/gnu/glibc/glibc-${this.meta().version}.tar.gz`,
            sha256: "nnyvxnngtqmxvj8egj2pv9z2r7wqd9f7j76yx53xhpxg74qwev7g"
        }
    ];

    headers = new KernelHeaders();

    build_dependencies = () => [
        new Bootstrap(), this.headers
    ];

    dependencies = () => [
        this.headers
    ];

    post_hooks = (): { [key: string]: BuildStep[] } => ({
        "unpack": [
            new GenericCommandStep("sed", ["-e", "s/\\& \\~DF_1_NOW/\\& \\~(DF_1_NOW | DF_1_NODEFLIB)/", "-i", this.root() + `/src/glibc-${this.meta().version}/elf/get-dynamic-info.h`]),
            //new GenericCommandStep("/usr/bin/which", ["sed"]),
        ],
        "install": [
            new GenericCommandStep("ln", ["-s", path.join(this.root(), "lib"), path.join(this.root(), "lib64")]),
            new MergePathsStep({ dynamic_linker: [path.join(this.root(), "lib64", "ld-linux-x86-64.so.2")] })
        ],
    });

    steps = (): { [key: string]: BuildStep } => ({
        "configure": new AutoconfStep({
            "--enable-kernel": "3.2",
            "--with-headers": `${path.join(this.headers.root(), "include")}`,
            "--disable-werror": undefined,
            "--enable-shared": undefined,
            "--without-selinux": undefined,
            "libc_cv_slibdir": path.join(this.root(), "lib")
        }, `../src/glibc-${this.meta().version}/configure`),
    });
}
