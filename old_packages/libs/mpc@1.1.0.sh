export VERSION=1.1.0
export BDEPEND="libs/gmp^6.2.0 libs/mpfr^4.0.2"

PACKAGE=mpc
COMP=tar.gz
UPSTREAM=https://ftp.gnu.org/gnu/
CONFIG_OPTS="--prefix=/usr --disable-static"

use_mod acmake
