export VERSION=8.0

export BDEPEND="libs/ncurses core/dbus"
export RDEPEND="libs/ncurses core/dbus"

PACKAGE=readline
COMP=tar.gz
UPSTREAM=http://ftp.gnu.org/gnu/
PRECONFSCRIPT="sed -i '/MV.*old/d' Makefile.in
sed -i '/{OLDSUFF}/c:' support/shlib-install"
CONFIG_OPTS="--prefix=/usr --disable-static"

use_mod acmake

