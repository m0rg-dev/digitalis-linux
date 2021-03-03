import * as pkg from "../../package";
import Glibc from "../lib/glibc";
import { BootstrapBuildroot } from "../x10/buildroot";

export default class Coreutils extends pkg.Package {
    meta = (): pkg.pkgmeta => ({
        name: "coreutils",
        url: "https://www.gnu.org/software/coreutils/",
        version: "8.32",
        release: 1,
        summary: "Basic file and text utilities",
        license: "GPLv3+"
    });

    srcs = (): pkg.pkgsrc[] => [
        {
            url: `https://ftp.gnu.org/gnu/coreutils/coreutils-${this.meta().version}.tar.gz`,
            sha256: "upngeguueg2rndmu403yge5y9xn91db3bp0jrbh6cwf3jwqwm6w0"
        }
    ];

    libc = new Glibc();

    build_import = () => [
        this.libc,
        new BootstrapBuildroot(),
    ]

    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "configure": new pkg.step.AutoconfStep({
            "--enable-install-program": "hostname",
            "--enable-no-install-program": "kill,uptime"
        })
    });
};