export VERSION=5.2.5

PACKAGE=xz
UPSTREAM=https://tukaani.org/
CONFIG_OPTS="--prefix=/usr --disable-static --docdir=/usr/share/doc/xz-$VERSION"
POSTINSTALLSCRIPT='
    mkdir -p bin lib usr/lib
    mv -v usr/bin/{lzma,unlzma,lzcat,xz,unxz,xzcat} bin
    mv -v usr/lib/liblzma.so.* lib
    ln -svf ../../lib/$(readlink usr/lib/liblzma.so) usr/lib/liblzma.so
'

use_mod acmake