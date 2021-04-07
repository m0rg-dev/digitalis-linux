source ../lib.sh

PACKAGE=xz
VERSION=5.2.5

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./gcc.sh
    x10-import ./bash.sh

    fetch-source "xz-${VERSION}" "3e1e518ffc912f86608a8cb35e4bd41ad1aec210df2a47aaa1f95e7f5576ef56" \
        "https://tukaani.org/xz/xz-${VERSION}.tar.xz"
    setup-build-dirs "xz-${VERSION}"
    use-compiler-wrapper
    build-autoconf --disable-static

    fix-shebangs $(x10-hash-of ./bash.sh)
}
