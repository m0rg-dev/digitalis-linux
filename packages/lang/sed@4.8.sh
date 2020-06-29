export VERSION=4.8

PACKAGE=sed
UPSTREAM="http://ftp.gnu.org/gnu/"
CONFIG_OPTS="--prefix=/usr --bindir=/bin"
POSTINSTALLSCRIPT="mkdir -p usr/bin; ln -s ../../bin/sed usr/bin/sed"
use_mod acmake
