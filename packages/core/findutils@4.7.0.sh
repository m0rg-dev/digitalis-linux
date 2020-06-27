VERSION=4.7.0

export SRC=findutils-$VERSION.tar.xz
export SRC_URL=http://ftp.gnu.org/gnu/findutils/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    mkdir build
    cd build
    ../findutils-$VERSION/configure --prefix=/usr --localstatedir=/var/lib/locate

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    mkdir -p bin
    mv -v usr/bin/find bin
    sed -i 's|find:=${BINDIR}|find:=/bin|' usr/bin/updatedb
    rm -r build findutils-$VERSION
}