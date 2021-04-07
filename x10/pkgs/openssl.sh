source ../lib.sh

PACKAGE=openssl
VERSION=1.1.1j

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./perl.sh

    fetch-source "openssl-${VERSION}" "aaf2fcb575cdf6491b98ab4829abf78a3dec8402b8b81efc8f23c00d443981bf" \
        "https://www.openssl.org/source/openssl-${VERSION}.tar.gz"
    setup-build-dirs "openssl-${VERSION}"
    CONFIGURE=../config build-autoconf shared zlib-dynamic
}
