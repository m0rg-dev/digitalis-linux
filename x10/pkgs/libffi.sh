source ../lib.sh

PACKAGE=libffi
VERSION=3.3

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./autoconf.sh
    x10-import ./automake.sh
    x10-import ./libtool.sh
    x10-import ./texinfo.sh

    fetch-source "libffi-${VERSION}" "3f2f86094f5cf4c36cfe850d2fe029d01f5c2c2296619407c8ba0d8207da9a6b" \
        "https://github.com/libffi/libffi/archive/v${VERSION}.tar.gz"
    setup-build-dirs "libffi-${VERSION}"
    build-command ./autogen.sh
    use-compiler-wrapper
    build-autoconf --disable-static
}