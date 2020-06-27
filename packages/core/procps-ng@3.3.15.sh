VERSION=3.3.15

export SRC=procps-ng-$VERSION.tar.xz
export SRC_URL=https://sourceforge.net/projects/procps-ng/files/Production/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    cd procps-ng-$VERSION
    ./configure --prefix=/usr \
        --exec-prefix=        \
        --libdir=/usr/lib     \
        --disable-static      \
        --disable-kill

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r procps-ng-$VERSION

    mkdir -p lib
    mv -v usr/lib/libprocps.so.* lib
    ln -sfv ../../lib/$(readlink usr/lib/libprocps.so) usr/lib/libprocps.so
}