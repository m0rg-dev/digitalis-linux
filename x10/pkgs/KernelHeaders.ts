import Spec, { BuildStep, GenericCommandStep, pkgmeta, pkgsrc } from '../Spec';
import Bootstrap from './Bootstrap';

export default class KernelHeaders extends Spec {
    meta = (): pkgmeta => ({
        url: "https://www.kernel.org",
        version: "5.11.2",
        release: 2,
        summary: "Development files for the Linux kernel",
        license: "GPLv2 with exceptions",
        workdir: () => `${this.root()}/src/linux-${this.meta().version}`
    });

    srcs = (): pkgsrc[] => [
        {
            url: `https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-${this.meta().version}.tar.xz`,
            sha256: "j155pf5uymk4xy6udhx58hfufugt2u5dezxr79yc3e5ujqaju2g0"
        }
    ];

    build_dependencies = () => [
        new Bootstrap()
    ];

    install_script = () => `
find usr/include -name '.*' -delete
rm usr/include/Makefile
cp -rv usr/include ${this.root()}/include
    `;


    steps = (): { [key: string]: BuildStep } => ({
        "configure": new GenericCommandStep("make", ["mrproper"]),
        "make": new GenericCommandStep("make", ["headers"]),
        "install": new GenericCommandStep("sh", ["-c", this.install_script()])
    });
}