VERSION=5.39

export SRC=file-$VERSION.tar.gz
export SRC_URL=ftp://ftp.astron.com/pub/file/$SRC

pkg_build() {
    tar xfz $SRC
    rm $SRC

    cd file-$VERSION
    ./configure --prefix=/usr
    make $MAKEOPTS
    make PREFIX=$(realpath ..)/usr install

    cd ..
    rm -r build file-$VERSION
}