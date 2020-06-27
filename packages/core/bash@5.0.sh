VERSION=5.0

export SRC=bash-$VERSION.tar.gz
export SRC_URL=http://ftp.gnu.org/gnu/bash/$SRC

pkg_build() {
    tar xfz $SRC
    rm $SRC

    cd bash-$VERSION
    ./configure --prefix=/usr --bindir=/bin
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r bash-$VERSION
}