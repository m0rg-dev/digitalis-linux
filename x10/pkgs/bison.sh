source ../lib.sh

PACKAGE=bison
VERSION=3.7.4

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./bash.sh
    x10-import-always ./m4.sh

    fetch-source "bison-${VERSION}" "a3b5813f48a11e540ef26f46e4d288c0c25c7907d9879ae50e430ec49f63c010" \
        "https://ftpmirror.gnu.org/gnu/bison/bison-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/bison/bison-${VERSION}.tar.xz"
    setup-build-dirs "bison-${VERSION}"
    build-autoconf

    fix-shebangs $(x10-hash-of ./bash.sh)
}
