import * as pkg from "../package";
import { BootstrapBuildroot } from "./Buildroot";
import KernelHeaders from "./KernelHeaders";

export default class Glibc extends pkg.Package {
    meta = (): pkg.pkgmeta => ({
        url: "https://www.gnu.org/software/libc/",
        version: "2.33",
        release: 1,
        summary: "The GNU C Library",
        license: "LGPLv2+ and LGPLv2+ with exceptions and GPLv2+ and GPLv2+ with exceptions and BSD and Inner-Net and ISC and Public Domain and GFDL"
    });

    srcs = (): pkg.pkgsrc[] => [
        {
            url: `https://ftp.gnu.org/gnu/glibc/glibc-${this.meta().version}.tar.gz`,
            sha256: "nnyvxnngtqmxvj8egj2pv9z2r7wqd9f7j76yx53xhpxg74qwev7g"
        }
    ];

    headers = new KernelHeaders();

    build_import = () => [
        new BootstrapBuildroot(),
        this.headers
    ];

    link_import = () => [
        this.headers
    ];

    on_import = (importer: pkg.Package) => {
        importer.data.setup.system_include_paths.push(this.treepath('include'));
        importer.data.setup.library_paths.push(this.treepath('lib'));
        importer.data.setup.dynamic_linker = this.treepath('lib64/ld-linux-x86-64.so.2')
    };

    post_hooks = (): { [key: string]: pkg.step.BuildStep[] } => ({
        "unpack": [
            new pkg.step.GenericCommandStep("sed", ["-e", "s/\\& \\~DF_1_NOW/\\& \\~(DF_1_NOW | DF_1_NODEFLIB)/", "-i", this.treepath(`src/glibc-${this.meta().version}/elf/get-dynamic-info.h`)]),
            //new pkg.step.GenericCommandStep("/usr/bin/which", ["sed"]),
        ],
        "install": [new pkg.step.GenericCommandStep("ln", ["-s", this.treepath('lib'), this.treepath('lib64')])]
    });

    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "configure": new pkg.step.AutoconfStep({
            "--enable-kernel": "3.2",
            "--with-headers": `${this.headers.treepath('include')}`,
            "--disable-werror": undefined,
            "--enable-shared": undefined,
            "libc_cv_slibdir": this.treepath('lib')
        }, true),
        // "make": new pkg.step.MakeStep(false)
    });

};
