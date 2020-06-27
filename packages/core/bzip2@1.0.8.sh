VERSION=1.0.8

export BDEPEND=diffutils^3.7

export SRC=bzip2-$VERSION.tar.gz
export SRC_URL=https://www.sourceware.org/pub/bzip2/$SRC

pkg_build() {
    tar xfz $SRC
    rm $SRC

    cd bzip2-$VERSION
    sed -i 's@\(ln -s -f \)$(PREFIX)/bin/@\1@' Makefile
    sed -i "s@(PREFIX)/man@(PREFIX)/share/man@g" Makefile
    make -f Makefile-libbz2_so $MAKEOPTS
    make clean
    make $MAKEOPTS
    make PREFIX=$(realpath ..)/usr install

    mkdir -p ../usr/lib/ ../bin ../lib

    cp -v bzip2-shared ../bin/bzip2
    cp -av libbz2.so* ../lib
    ln -sv ../../lib/libbz2.so.1.0 ../usr/lib/libbz2.so
    rm -v ../usr/bin/{bunzip2,bzcat,bzip2}
    ln -sv bzip2 ../bin/bunzip2
    ln -sv bzip2 ../bin/bzcat

    cd ..
    rm -r bzip2-$VERSION
}