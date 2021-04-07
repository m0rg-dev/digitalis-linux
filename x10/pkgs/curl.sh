source ../lib.sh

PACKAGE=curl
VERSION=7.76.0

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./openssl.sh
    x10-import ./zlib.sh
    x10-import ./p11-kit.sh
    x10-import ./bash.sh

    fetch-source "curl-${VERSION}" "6302e2d75c59cdc6b35ce3fbe716481dd4301841bbb5fd71854653652a014fc8" \
        "https://curl.haxx.se/download/curl-${VERSION}.tar.xz"
    setup-build-dirs "curl-${VERSION}"
    use-compiler-wrapper
    build-autoconf --disable-static --without-zstd
    fix-shebangs $(x10-hash-of ./bash.sh)
}
