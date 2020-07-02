export VERSION=0.20

PACKAGE=gettext
UPSTREAM=http://ftp.gnu.org/gnu/
CONFIG_OPTS="--prefix=/usr --disable-static"
MAKESCRIPT="make -j1"
use_mod acmake

