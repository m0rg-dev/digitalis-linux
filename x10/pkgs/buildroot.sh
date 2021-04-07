source ../lib.sh

PACKAGE=buildroot
VERSION=1

x10-generate() {
    x10-import-always ./sysroot.sh

    x10-import-always ./autoconf.sh
    x10-import-always ./automake.sh
    x10-import-always ./bison.sh
    x10-import-always ./curl.sh
    x10-import-always ./gcc.sh
    x10-import-always ./glibc.sh
    x10-import-always ./gzip.sh
    x10-import-always ./libtool.sh
    x10-import-always ./m4.sh
    x10-import-always ./make.sh
    x10-import-always ./pkgconf.sh
    x10-import-always ./tar.sh
    x10-import-always ./xz.sh
}