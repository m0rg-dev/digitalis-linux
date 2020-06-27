export VERSION=9.3.0
export BDEPEND="libs/gmp^6.2.0 libs/mpc^1.1.0 libs/mpfr^4.0.2 libs/zlib^1.2.11"

PACKAGE=gcc
UPSTREAM="http://ftp.gnu.org/gnu/"
CONFIG_OPTS="--prefix=/usr --enable-languages=c,c++ --disable-multilib --disable-bootstrap --with-system-zlib"
PRECONFSCRIPT="sed -e '/m64=/s/lib64/lib/' -i.orig ../gcc-\$VERSION/gcc/config/i386/t-linux64"
POSTINSTALLSCRIPT='
    mkdir -p lib
    ln -sv ../usr/bin/cpp lib/
    ln -sv gcc usr/bin/cc
    install -v -dm755 usr/lib/bfd-plugins
    ln -sfv ../../libexec/gcc/$(gcc -dumpmachine)/9.2.0/liblto_plugin.so \
        usr/lib/bfd-plugins/
    mkdir -pv usr/share/gdb/auto-load/usr/lib
    mv -v usr/lib/*gdb.py usr/share/gdb/auto-load/usr/lib
'
USE_BUILD_DIR=1

use_mod acmake
