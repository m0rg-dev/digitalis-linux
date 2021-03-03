import * as pkg from "../../package";
import Glibc from "../lib/glibc";
import Ncurses from "../lib/ncurses";
import { BootstrapBuildroot } from "../x10/buildroot";

export default class Bash extends pkg.Package {
    meta = (): pkg.pkgmeta => ({
        name: "bash",
        url: "https://www.gnu.org/software/bash/",
        version: "5.0",
        release: 1,
        summary: "The Bourne Again SHell",
        license: "GPLv3+"
    });

    srcs = (): pkg.pkgsrc[] => [
        {
            url: `https://ftp.gnu.org/gnu/bash/bash-${this.meta().version}.tar.gz`,
            sha256: "pjm0yap6c5rb549yzfxty9cmy7vpryruzm8zf6f240uxcc3qzd6g"
        }
    ];

    libc = new Glibc();
    ncurses = new Ncurses();
    
    build_import = () => [
        new BootstrapBuildroot(),
        this.libc,
        this.ncurses
    ]

    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "configure": new pkg.step.AutoconfStep({
            "--without-bash-malloc": undefined,
            "--with-curses": undefined,
            "bash_cv_getcwd_malloc": "yes"
        })
    });
};