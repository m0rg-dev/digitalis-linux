VERSION=6.7

export BDEPEND="core/perl>=5.32.0"
export RDEPEND="core/perl>=5.32.0"
export SRC="texinfo-$VERSION.tar.xz"

pkg_build() {
    tar xfJ texinfo-$VERSION.tar.xz
    rm texinfo-$VERSION.tar.xz

    mkdir -p build
    cd build

    ../texinfo-$VERSION/configure --prefix=/usr
    make $MAKEOPTS
    make DESTDIR=$(realpath ../) install
    cd ..
    rm -r build texinfo-$VERSION
}