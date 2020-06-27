VERSION=1.2.11

export SRC=zlib-$VERSION.tar.xz
export SRC_URL=https://zlib.net/$SRC

pkg_build() {
    tar xfJ zlib-$VERSION.tar.xz
    rm zlib-$VERSION.tar.xz
    cd zlib-$VERSION

    ./configure --prefix=/usr
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install
    cd ..
    rm -r zlib-$VERSION

    mkdir -p lib
    mv -v usr/lib/libz.so.* lib
    ln -sfv ../../lib/$(readlink usr/lib/libz.so) usr/lib/libz.so
}