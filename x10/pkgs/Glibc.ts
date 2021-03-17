import { Environment } from "../Environment";
import { Spec } from "../Spec";

export default class Glibc extends Spec {
    meta = {
        url: "https://www.gnu.org/software/libc/",
        version: "2.33",
        summary: "The GNU C Library",
        license: "LGPLv2+ and LGPLv2+ with exceptions and GPLv2+ and GPLv2+ with exceptions and BSD and Inner-Net and ISC and Public Domain and GFDL"
    };

    options = () => ({
        setup: {
            environment: new Environment([
                { name: "Bootstrap" },
                { name: "KernelHeaders" }
            ])
        },
        fetch: {
            srcs: [{
                url: `https://ftp.gnu.org/gnu/glibc/glibc-${this.meta.version}.tar.gz`
            }]
        }
    });
}