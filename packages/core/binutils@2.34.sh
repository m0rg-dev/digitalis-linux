VERSION=2.34

export BDEPEND="core/diffutils^3.7 core/perl^5.32.0 core/texinfo^6.7"
export SRC="binutils-$VERSION.tar.xz"

pkg_build() {
    tar xfJ binutils-$VERSION.tar.xz
    rm binutils-$VERSION.tar.xz

    mkdir -p build
    cd build

    ../binutils-$VERSION/configure \
        --prefix=/usr              \
        --enable-gold              \
        --enable-ld=default        \
        --enable-plugins           \
        --enable-shared            \
        --disable-werror           \
        --enable-64-bit-bfd

    make
    make DESTDIR=$(realpath ..) install
    cd ..
    rm -r build binutils-$VERSION
}