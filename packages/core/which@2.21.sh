VERSION=2.21

export SRC=which-$VERSION.tar.gz
export SRC_URL=https://ftp.gnu.org/gnu/which/$SRC

pkg_build() {
    tar xfz $SRC
    rm $SRC

    cd which-$VERSION
    ./configure --prefix=/usr
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r which-$VERSION
}