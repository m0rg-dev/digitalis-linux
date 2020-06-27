VERSION=4.0.2

export BDEPEND="core/gmp^6.2.0"
export SRC=mpfr-$VERSION.tar.xz
export SRC_URL="http://www.mpfr.org/mpfr-$VERSION/$src"

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    mkdir build
    cd build
    ../mpfr-$VERSION/configure \
        --prefix=/usr --disable-static --enable-thread-safe

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r build mpfr-$VERSION
}