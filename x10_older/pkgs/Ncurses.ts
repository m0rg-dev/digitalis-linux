import * as pkg from "../package";
import { BootstrapBuildroot } from "./Buildroot";
import Glibc from "./Glibc";

export default class Ncurses extends pkg.Package {
    meta = (): pkg.pkgmeta => ({
        url: "https://invisible-island.net/ncurses/",
        version: "6.2",
        release: 2,
        summary: "Terminal UI library",
        license: "MIT"
    });

    srcs = (): pkg.pkgsrc[] => [
        {
            url: `https://ftp.gnu.org/gnu/ncurses/ncurses-${this.meta().version}.tar.gz`,
            sha256: "60r6w33pw3wz3w6yk1yf3j1abggy3kk5d2wj4zvxmpvhtfn8djeg"
        }
    ];

    libc = new Glibc();

    build_import = () => [
        new BootstrapBuildroot(),
        this.libc
    ]

    on_import = (importer: pkg.Package) => {
        importer.data.setup.library_paths.push(this.treepath('lib'));
        importer.data.setup.system_include_paths.push(this.treepath('include'));
        importer.data.setup.system_include_paths.push(this.treepath('include/ncursesw'));
    }

    steps = (): { [key: string]: pkg.step.BuildStep } => ({
        "configure": new pkg.step.AutoconfStep({
            "--with-manpage-format": "normal",
            "--with-shared": undefined,
            "--without-debug": undefined,
            "--without-ada": undefined,
            "--enable-pc-files": undefined,
            "--with-pkg-config-libdir": (pkg: pkg.Package) => pkg.treepath("lib/pkgconfig")
        })
    });
};