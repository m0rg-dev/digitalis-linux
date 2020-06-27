VERSION=3.7

export SRC="diffutils-$VERSION.tar.xz"
export SRC_URL=http://ftp.gnu.org/gnu/diffutils/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    mkdir -p build
    cd build

    ../diffutils-$VERSION/configure \
        --prefix=/usr

    make $MAKEOPTS
    make DESTDIR=$(realpath ../) install

    cd ..
    rm -r build diffutils-$VERSION
}