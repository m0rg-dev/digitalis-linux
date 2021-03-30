source ../lib.sh

export PACKAGE=gmp
export VERSION=6.2.1

x10-generate() {
    x10-import ../sysroot/crossbuilt-sysroot.sh
    x10-import ./glibc.sh

    fetch-source "gmp-${VERSION}" "fd4829912cddd12f84181c3451cc752be224643e87fac497b69edddadc49b4f2" \
        "https://ftpmirror.gnu.org/gnu/gmp/gmp-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/gmp/gmp-${VERSION}.tar.xz"
    setup-build-dirs "gmp-${VERSION}"
    build-command cp -v config{fsf,}.guess 
    build-command cp -v config{fsf,}.sub
    use-libtool-gcc-wrapper
    build-autoconf --enable-cxx --disable-static
}
