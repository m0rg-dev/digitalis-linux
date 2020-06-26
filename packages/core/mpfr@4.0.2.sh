VERSION=4.0.2

export BDEPEND="stage2/gmp^6.2.0"
export SRC=mpfr-$VERSION.tar.xz

pkg_build() {
    tar xfJ mpfr-$VERSION.tar.xz
    rm mpfr-$VERSION.tar.xz

    mkdir build
    cd build
    ../mpfr-$VERSION/configure \
        --prefix=/usr --disable-static --enable-thread-safe

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install
}