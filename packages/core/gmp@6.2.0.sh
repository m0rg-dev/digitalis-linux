VERSION=6.2.0

export SRC=gmp-$VERSION.tar.xz

pkg_build() {
    tar xfJ gmp-$VERSION.tar.xz
    rm gmp-$VERSION.tar.xz

    mkdir build
    cd build
    ../gmp-$VERSION/configure \
        --prefix=/usr --disable-static

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install
}