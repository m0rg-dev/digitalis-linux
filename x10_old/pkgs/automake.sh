source ../lib.sh

PACKAGE=automake
VERSION=1.16.3

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./bash.sh
    x10-import-always ./perl.sh
    x10-import-always ./autoconf.sh
    x10-import-always ./m4.sh

    fetch-source "automake-${VERSION}" "ce010788b51f64511a1e9bb2a1ec626037c6d0e7ede32c1c103611b9d3cba65f" \
        "https://ftpmirror.gnu.org/gnu/automake/automake-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/automake/automake-${VERSION}.tar.gz"
    setup-build-dirs "automake-${VERSION}"
    build-autoconf

    fix-shebangs $(x10-hash-of ./bash.sh)
}
