source ../lib.sh

PACKAGE=diffutils
VERSION=3.7

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./gcc.sh

    fetch-source "diffutils-${VERSION}" "b3a7a6221c3dc916085f0d205abf6b8e1ba443d4dd965118da364a1dc1cb3a26" \
        "https://ftpmirror.gnu.org/gnu/diffutils/diffutils-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/diffutils/diffutils-${VERSION}.tar.xz"
    setup-build-dirs "diffutils-${VERSION}"
    build-autoconf
}
