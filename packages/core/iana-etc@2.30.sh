VERSION=2.30

export SRC=iana-etc-$VERSION.tar.bz2
export SRC_URL=http://sethwklein.net/$VERSION

pkg_build() {
    tar xfj $SRC
    rm $SRC

    cd iana-etc-$VERSION
    make
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r iana-etc-$VERSION
}