source ../lib.sh

export PACKAGE=mpfr
export VERSION=4.1.0

x10-generate() {
    x10-import ../sysroot/crossbuilt-sysroot.sh
    x10-import ./glibc.sh
    x10-import ./gmp.sh

    fetch-source "mpfr-${VERSION}" "0c98a3f1732ff6ca4ea690552079da9c597872d30e96ec28414ee23c95558a7f" \
        "https://ftpmirror.gnu.org/gnu/mpfr/mpfr-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/mpfr/mpfr-${VERSION}.tar.xz"
    setup-build-dirs "mpfr-${VERSION}"
    use-libtool-gcc-wrapper
    build-autoconf --enable-thread-safe --disable-static
}
