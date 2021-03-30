source ../lib.sh

export PACKAGE=mpc
export VERSION=1.2.1

x10-generate() {
    x10-import ../sysroot/crossbuilt-sysroot.sh
    x10-import ./glibc.sh
    x10-import ./gmp.sh
    x10-import ./mpfr.sh

    fetch-source "mpc-${VERSION}" "17503d2c395dfcf106b622dc142683c1199431d095367c6aacba6eec30340459" \
        "https://ftpmirror.gnu.org/gnu/mpc/mpc-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/mpc/mpc-${VERSION}.tar.xz"
    setup-build-dirs "mpc-${VERSION}"
    use-libtool-gcc-wrapper
    build-autoconf --disable-static
}
