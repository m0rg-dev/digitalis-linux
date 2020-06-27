VERSION=3.4

export SRC=grep-$VERSION.tar.xz
export SRC_URL=http://ftp.gnu.org/gnu/grep/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    cd grep-$VERSION
    ./configure --prefix=/usr --bindir=/bin
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r grep-$VERSION
}