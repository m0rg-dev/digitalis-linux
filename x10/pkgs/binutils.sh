source ../lib.sh

export PACKAGE=binutils
export VERSION=2.36

x10-generate() {
    x10-import .//crossbuilt-sysroot.sh
    x10-import ./glibc.sh

    fetch-source "binutils-${VERSION}" "5788292cc5bbcca0848545af05986f6b17058b105be59e99ba7d0f9eb5336fb8" \
        "https://ftpmirror.gnu.org/gnu/binutils/binutils-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/binutils/binutils-${VERSION}.tar.xz"
    setup-build-dirs "binutils-${VERSION}"
    use-libtool-gcc-wrapper
    build-autoconf --enable-shared --disable-werror --enable-deterministic-archives
}
