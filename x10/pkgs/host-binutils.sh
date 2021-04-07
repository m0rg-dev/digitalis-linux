source ../lib.sh

export PACKAGE=host-binutils
export VERSION=2.36
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "binutils-${VERSION}" "5788292cc5bbcca0848545af05986f6b17058b105be59e99ba7d0f9eb5336fb8" \
        "https://ftpmirror.gnu.org/gnu/binutils/binutils-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/binutils/binutils-${VERSION}.tar.xz"
    setup-build-dirs "binutils-${VERSION}"
    use-libtool-gcc-wrapper
    build-autoconf --host=$X10_TARGET --build='$(../config.guess)' --disable-nls --enable-shared --disable-werror --enable-deterministic-archives
}
