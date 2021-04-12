source ../lib.sh

PACKAGE=file
VERSION=5.39

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./gcc.sh
    x10-import ./zlib.sh
    x10-import ./xz.sh

    fetch-source "file-${VERSION}" "f05d286a76d9556243d0cb05814929c2ecf3a5ba07963f8f70bfaaa70517fad1" \
        "http://astron.com/pub/file/file-${VERSION}.tar.gz"
    setup-build-dirs "file-${VERSION}"
    use-compiler-wrapper
    build-autoconf --disable-bzlib
}
