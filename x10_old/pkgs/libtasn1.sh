source ../lib.sh

PACKAGE=libtasn1
VERSION=4.16.0

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./pkgconf.sh

    fetch-source "libtasn1-${VERSION}" "0e0fb0903839117cb6e3b56e68222771bebf22ad7fc2295a0ed7d576e8d4329d" \
        "https://ftpmirror.gnu.org/gnu/libtasn1/libtasn1-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/libtasn1/libtasn1-${VERSION}.tar.gz"
    setup-build-dirs "libtasn1-${VERSION}"
    use-compiler-wrapper
    build-autoconf --disable-static
}
