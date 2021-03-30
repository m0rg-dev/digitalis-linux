source ../lib.sh

export PACKAGE=host-xbinutils
export VERSION=2.36
INHERIT_ENVIRONMENT=1
X10_PERMIT_EXTERNAL_LIBS=1

x10-generate() {
    fetch-source "binutils-${VERSION}" "5788292cc5bbcca0848545af05986f6b17058b105be59e99ba7d0f9eb5336fb8" \
        "https://ftpmirror.gnu.org/gnu/binutils/binutils-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/binutils/binutils-${VERSION}.tar.xz"
    setup-build-dirs "binutils-${VERSION}"
    build-autoconf --target=x86_64-x10-linux-gnu --with-sysroot=$(x10-tree) --disable-nls --disable-werror
}
