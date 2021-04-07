source ../lib.sh

PACKAGE=gzip
VERSION=1.10

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./bash.sh

    fetch-source "gzip-${VERSION}" "8425ccac99872d544d4310305f915f5ea81e04d0f437ef1a230dc9d1c819d7c0" \
        "https://ftpmirror.gnu.org/gnu/gzip/gzip-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/gzip/gzip-${VERSION}.tar.gz"
    setup-build-dirs "gzip-${VERSION}"
    build-autoconf
    fix-shebangs $(x10-hash-of ./bash.sh)
}
