import * as pkg from "../../package";
import { BootstrapBuildroot } from "../x10/buildroot";

export default class KernelHeaders extends pkg.Package {
    meta = (): pkg.pkgmeta => ({
        name: "kernel-headers",
        url: "https://www.kernel.org",
        version: "5.11.2",
        release: 2,
        summary: "Development files for the Linux kernel",
        license: "GPLv2 with exceptions"
    });

    srcs = (): pkg.pkgsrc[] => [
        {
            url: `https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-${this.meta().version}.tar.xz`,
            sha256: "j155pf5uymk4xy6udhx58hfufugt2u5dezxr79yc3e5ujqaju2g0"
        }
    ];

    build_import = () => [
        new BootstrapBuildroot()
    ];

    on_import = (importer: pkg.Package) => {
        importer.data.setup.system_include_paths.push(this.treepath('include'));
    };

    install_script = () => `
find usr/include -name '.*' -delete
rm usr/include/Makefile
cp -rv usr/include ${this.treepath()}/include
    `;


    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "unpack": new pkg.step.UnpackStep(1, `linux-${this.meta().version}`),
        "configure": new pkg.step.GenericCommandStep("make", ["mrproper"]),
        "make": new pkg.step.GenericCommandStep("make", ["headers"]),
        "install": new pkg.step.GenericCommandStep("sh", ["-c", this.install_script()])
    });
};