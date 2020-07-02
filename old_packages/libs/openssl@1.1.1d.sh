export VERSION=1.1.1d

export BDEPEND="libs/zlib"
export RDEPEND="libs/zlib"

export SRC=openssl-$VERSION.tar.gz
export SRC_URL=https://www.openssl.org/source/$SRC

pkg_build() {
    tar xfz $SRC
    rm $SRC

    cd openssl-$VERSION
    ./config --prefix=/usr --openssldir=/etc/ssl --libdir=lib shared zlib-dynamic
    make $MAKEOPTS
    sed -i '/INSTALL_LIBS/s/libcrypto.a libssl.a//' Makefile
    make DESTDIR=$(realpath ..) MANSUFFIX=ssl install

    cd ..
    ldconfig -N -r .
    rm -f etc/ld.so.cache
    rm -rf openssl-$VERSION
}