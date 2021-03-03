import * as pkg from "../../package";
import BasePackage from "../x10_meta/base";

export default class Ncurses extends BasePackage {
    meta = (): pkg.pkgmeta => ({
        name: "ncurses",
        url: "https://invisible-island.net/ncurses/",
        version: "6.2",
        release: 1,
        summary: "Terminal UI library",
        license: "MIT"
    });

    srcs = (): pkg.pkgsrc[] => [
        {
            url: `https://ftp.gnu.org/gnu/ncurses/ncurses-${this.meta().version}.tar.gz`,
            sha256: "60r6w33pw3wz3w6yk1yf3j1abggy3kk5d2wj4zvxmpvhtfn8djeg"
        }
    ];

    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "configure": new pkg.step.AutoconfStep({
            "--with-manpage-format": "normal",
            "--with-shared": undefined,
            "--without-debug": undefined,
            "--without-ada": undefined,
            "--without-normal": undefined,
            "--enable-pc-files": undefined,
            "--with-pkg-config-libdir": (pkg: pkg.Package) => pkg.treepath("lib/pkgconfig"),
            "--enable-widec": undefined
        })
    });
};