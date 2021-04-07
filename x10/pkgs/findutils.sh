source ../lib.sh

PACKAGE=findutils
VERSION=4.7.0

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./gcc.sh
    x10-import ./bash.sh

    fetch-source "findutils-${VERSION}" "c5fefbdf9858f7e4feb86f036e1247a54c79fc2d8e4b7064d5aaa1f47dfa789a" \
        "https://ftpmirror.gnu.org/gnu/findutils/findutils-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/findutils/findutils-${VERSION}.tar.gz"
    setup-build-dirs "findutils-${VERSION}"
    build-autoconf --without-selinux

    fix-shebangs $(x10-hash-of ./bash.sh)
}
