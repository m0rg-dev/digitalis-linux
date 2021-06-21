source ../lib.sh

export PACKAGE=zlib
export VERSION=1.2.11

x10-generate() {
    x10-import .//crossbuilt-sysroot.sh
    x10-import ./glibc.sh

    fetch-source "zlib-${VERSION}" "4ff941449631ace0d4d203e3483be9dbc9da454084111f97ea0a2114e19bf066" \
        "http://zlib.net/zlib-${VERSION}.tar.xz"
    setup-build-dirs "zlib-${VERSION}"
    use-libtool-gcc-wrapper
    MAKE_JOBS=-j1 build-autoconf
}
