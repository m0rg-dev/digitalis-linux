source ../lib.sh

PACKAGE=autoconf
VERSION=2.71

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./bash.sh
    x10-import-always ./perl.sh
    x10-import-always ./m4.sh

    fetch-source "autoconf-${VERSION}" "431075ad0bf529ef13cb41e9042c542381103e80015686222b8a9d4abef42a1c" \
        "https://ftpmirror.gnu.org/gnu/autoconf/autoconf-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/autoconf/autoconf-${VERSION}.tar.gz"
    setup-build-dirs "autoconf-${VERSION}"
    build-autoconf

    fix-shebangs $(x10-hash-of ./bash.sh)
}
