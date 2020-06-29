export VERSION=5.0
export RDEPEND="ncurses^6.2"

PACKAGE=bash
COMP=tar.gz
UPSTREAM="http://ftp.gnu.org/gnu/"
CONFIG_OPTS="--prefix=/usr --bindir=/bin"
POSTINSTALLSCRIPT="ln -s bash bin/sh"

use_mod acmake
