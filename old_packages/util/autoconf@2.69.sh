VERSION=2.69

export SRC=autoconf-$VERSION.tar.xz
export SRC_URL=http://ftp.gnu.org/gnu/autoconf/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    cd autoconf-$VERSION
    ./configure --prefix=/usr --bindir=/bin
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r autoconf-$VERSION
}