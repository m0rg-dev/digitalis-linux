source ../lib.sh

PACKAGE=pkgconf
VERSION=1.7.4

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./autoconf.sh
    x10-import ./automake.sh
    x10-import ./libtool.sh

    fetch-source "pkgconf-${VERSION}" "2828dcdef88098748c306281d64a630b4ccd0703b1d92b532c31411e531d3088" \
        "https://github.com/pkgconf/pkgconf/archive/refs/tags/pkgconf-${VERSION}.tar.gz"
    UNPACK_DIR=pkgconf-pkgconf-${VERSION} setup-build-dirs "pkgconf-${VERSION}"
    build-command ./autogen.sh
    use-compiler-wrapper
    build-autoconf --disable-static
    build-command ln -sv pkgconf $(x10-tree)/bin/pkg-config
}
