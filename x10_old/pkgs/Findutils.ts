import * as pkg from "../package";
import { BootstrapBuildroot } from "./Buildroot";
import Glibc from "./Glibc";

export default class Findutils extends pkg.Package {
    meta = (): pkg.pkgmeta => ({
        url: "https://www.gnu.org/software/findutils/",
        version: "4.7.0",
        release: 1,
        summary: "Basic directory searching utilities",
        license: "GPLv3+"
    });

    srcs = (): pkg.pkgsrc[] => [
        {
            url: `https://ftp.gnu.org/gnu/findutils/findutils-${this.meta().version}.tar.xz`,
            sha256: "rqzfqqwrb3vy9znrdw1pw4j7mn67kz1dht5q0t6nnagz8zfuf2d0"
        }
    ];

    libc = new Glibc();

    build_import = () => [
        this.libc,
        new BootstrapBuildroot(),
    ]
};