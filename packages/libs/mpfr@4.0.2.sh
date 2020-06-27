export VERSION=4.0.2
export BDEPEND="libs/gmp^6.2.0"

PACKAGE=mpfr
CONFIG_OPTS="--prefix=/usr --disable-static --enable-thread-safe"
USE_BUILD_DIR=1

use_mod acmake

export SRC_URL="http://www.mpfr.org/mpfr-$VERSION/$SRC"