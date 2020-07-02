export VERSION=1.0.8
export BDEPEND=util/diffutils^3.7

PACKAGE=bzip2
COMP=tar.gz
UPSTREAM=https://www.sourceware.org/pub/
SKIP_CONFIGURE=1
PRECONFSCRIPT='
    sed -i '\''s@\(ln -s -f \)$(PREFIX)/bin/@\1@'\'' Makefile
    sed -i "s@(PREFIX)/man@(PREFIX)/share/man@g" Makefile
    make -f Makefile-libbz2_so $MAKEOPTS
    make clean
'
POSTINSTALLSCRIPT='
    mkdir -p usr/lib bin lib
    cp $UNPACK_DIR/bzip2-shared bin/bzip2
    cp -av $UNPACK_DIR/libbz2.so* lib
    ln -sv ../../lib/libbz2.so.1.0 usr/lib/libbz2.so
    rm -v usr/bin/{bunzip2,bzcat,bzip2}
    ln -sv bzip2 bin/bunzip2
    ln -sv bzip2 bin/bzcat
'
MAKEINSTALLOPTS="PREFIX=$(realpath .)/usr"

use_mod acmake
