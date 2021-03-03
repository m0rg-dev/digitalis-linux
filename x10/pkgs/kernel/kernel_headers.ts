import * as pkg from "../../package";
import BasePackage from "../x10_meta/base";

export default class KernelHeaders extends BasePackage {
    meta = (): pkg.pkgmeta => ({
        name: "kernel-headers",
        url: "https://www.kernel.org",
        version: "5.11.2",
        release: 1,
        summary: "Development files for the Linux kernel",
        license: "GPLv2 with exceptions"
    });

    srcs = (): pkg.pkgsrc[] => [
        {
            url: `https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-${this.meta().version}.tar.xz`,
            sha256: "j155pf5uymk4xy6udhx58hfufugt2u5dezxr79yc3e5ujqaju2g0"
        }
    ];

    static install_script = `
find usr/include -name '.*' -delete
rm usr/include/Makefile
install -dm755 ../usr/
cp -rv usr/include ../usr/
    `;

    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "unpack": new pkg.step.UnpackStep(1, `linux-${this.meta().version}`),
        "configure": new pkg.step.GenericCommandStep("make", ["mrproper"]),
        "make": new pkg.step.GenericCommandStep("make", ["headers"]),
        "install": new pkg.step.GenericCommandStep("sh", ["-c", KernelHeaders.install_script])
    });
};