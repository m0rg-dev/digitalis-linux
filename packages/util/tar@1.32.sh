VERSION=1.32

export SRC=tar-$VERSION.tar.xz
export SRC_URL=http://ftp.gnu.org/gnu/tar/tar-1.32.tar.xz

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    mkdir build
    cd build
    FORCE_UNSAFE_CONFIGURE=1 ../tar-$VERSION/configure --prefix=/usr --bindir=/bin

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r build tar-$VERSION
}