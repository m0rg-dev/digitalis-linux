VERSION=1.1.0

export BDEPEND="stage2/gmp^6.2.0 stage2/mpfr^4.0.2"
export SRC=mpc-$VERSION.tar.gz

pkg_build() {
    tar xfz mpc-$VERSION.tar.gz
    rm mpc-$VERSION.tar.gz

    mkdir build
    cd build
    ../mpc-$VERSION/configure \
        --prefix=/usr --disable-static

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install
}