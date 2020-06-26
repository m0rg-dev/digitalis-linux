VERSION=3.7

export SRC="diffutils-$VERSION.tar.xz"

pkg_build() {
    tar xfJ diffutils-$VERSION.tar.xz
    rm diffutils-$VERSION.tar.xz

    mkdir -p build
    cd build

    ../diffutils-$VERSION/configure \
        --prefix=/usr

    make
    make DESTDIR=$(realpath ../) install

    cd ..
    rm -r build diffutils-$VERSION
}