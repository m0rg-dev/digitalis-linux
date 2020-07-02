export VERSION=3.3.15

PACKAGE=procps-ng
CONFIG_OPTS="--prefix=/usr --exec-prefix= --libdir=/usr/lib --disable-static --disable-kill"

use_mod acmake

export SRC_URL=https://sourceforge.net/projects/procps-ng/files/Production/$SRC

    #mv -v usr/lib/libprocps.so.* lib
    #ln -sfv ../../lib/$(readlink usr/lib/libprocps.so) usr/lib/libprocps.so
