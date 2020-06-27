VERSION=1.1.0

export BDEPEND="core/gmp^6.2.0 core/mpfr^4.0.2"
export SRC=mpc-$VERSION.tar.gz
export SRC_URL=https://ftp.gnu.org/gnu/mpc/$SRC

pkg_build() {
    tar xfz $SRC
    rm $SRC

    mkdir build
    cd build
    ../mpc-$VERSION/configure \
        --prefix=/usr --disable-static

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r build mpc-$VERSION
}