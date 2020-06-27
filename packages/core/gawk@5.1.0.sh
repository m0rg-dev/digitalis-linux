VERSION=5.1.0

export SRC=gawk-$VERSION.tar.xz
export SRC_URL=http://ftp.gnu.org/gnu/gawk/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    cd gawk-$VERSION
    ./configure --prefix=/usr --bindir=/bin
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r gawk-$VERSION
}