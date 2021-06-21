source ../lib.sh

PACKAGE=libtool
VERSION=2.4.6

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./bash.sh
    x10-import-always ./m4.sh

    fetch-source "libtool-${VERSION}" "e3bd4d5d3d025a36c21dd6af7ea818a2afcd4dfc1ea5a17b39d7854bcd0c06e3" \
        "https://ftpmirror.gnu.org/gnu/libtool/libtool-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/libtool/libtool-${VERSION}.tar.gz"
    setup-build-dirs "libtool-${VERSION}"
    use-compiler-wrapper
    build-autoconf

    fix-shebangs $(x10-hash-of ./bash.sh)
}
