VERSION=4.8

export SRC=sed-$VERSION.tar.xz
export SRC_URL=http://ftp.gnu.org/gnu/sed/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC
    
    cd sed-$VERSION
    ./configure --prefix=/usr --bindir=/bin
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r sed-$VERSION
}