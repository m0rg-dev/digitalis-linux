export VERSION=2.34
export BDEPEND="util/diffutils^3.7 lang/perl^5.32.0 util/texinfo^6.7"

PACKAGE=binutils
UPSTREAM=http://ftp.gnu.org/gnu/
CONFIG_OPTS="--prefix=/usr --enable-gold --enable-ld=default --enable-plugins"
CONFIG_OPTS="$CONFIG_OPTS --disable-werror --enable-64-bit-bfd --with-system-zlib"

use_mod acmake
