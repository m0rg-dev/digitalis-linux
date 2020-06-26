VERSION=9.3.0

export BDEPEND="stage2/gmp^6.2.0 stage2/mpc^1.1.0 stage2/mpfr^4.0.2"
export SRC=gcc-$VERSION.tar.xz

pkg_build() {
    tar xfJ gcc-$VERSION.tar.xz
    rm gcc-$VERSION.tar.xz

    mkdir build
    cd build
    ../gcc-$VERSION/configure --prefix=/usr \
             --enable-languages=c,c++       \
             --disable-multilib             \
             --disable-bootstrap
    
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install
}