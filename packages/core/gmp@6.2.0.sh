VERSION=6.2.0

export SRC=gmp-$VERSION.tar.xz
export SRC_URL=http://ftp.gnu.org/gnu/gmp/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    mkdir build
    cd build
    ../gmp-$VERSION/configure \
        --prefix=/usr --disable-static

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r build gmp-$VERSION
}