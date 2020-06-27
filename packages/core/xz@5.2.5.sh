VERSION=5.2.5

export SRC=xz-$VERSION.tar.xz
export SRC_URL=https://tukaani.org/xz/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    cd xz-$VERSION
    ./configure --prefix=/usr --disable-static --docdir=/usr/share/doc/xz-$VERSION

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install
    cd ..
    mkdir -p bin lib usr/lib
    mv -v usr/bin/{lzma,unlzma,lzcat,xz,unxz,xzcat} bin
    mv -v usr/lib/liblzma.so.* lib
    ln -svf ../../lib/$(readlink usr/lib/liblzma.so) usr/lib/liblzma.so

    rm -r xz-$VERSION
}