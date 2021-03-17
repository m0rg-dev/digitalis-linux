import { Environment } from "../Environment";
import { CommandStep, Spec } from "../Spec";

export default class KernelHeaders extends Spec {
    meta = {
        url: "https://www.kernel.org",
        version: "5.11.2",
        summary: "Development files for the Linux kernel",
        license: "GPLv2 with exceptions"
    };

    options = () => ({
        setup: {
            environment: new Environment([{ name: "Bootstrap" }])
        },
        fetch: {
            srcs: [{
                url: `https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-${this.meta.version}.tar.xz`,
            }]
        },
        workdir: `src/linux-${this.meta.version}`
    });

    install_script = () => `
find usr/include -name '.*' -delete
rm usr/include/Makefile
cp -rv usr/include ${this.tree()}/include
    `;

    steps = () => ({
        "configure": new CommandStep("make", ["mrproper"]),
        "make": new CommandStep("make", ["headers"]),
        "install": new CommandStep("sh", ["-c", this.install_script()])
    });
}
