export VERSION=1.2.11

PACKAGE=zlib
POSTINSTALLSCRIPT='
    mkdir -p lib
    mv -v usr/lib/libz.so.* lib
    ln -sfv ../../lib/$(readlink usr/lib/libz.so) usr/lib/libz.so
'

use_mod acmake

export SRC_URL=https://zlib.net/$SRC
