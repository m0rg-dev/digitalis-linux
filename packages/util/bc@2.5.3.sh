export VERSION=2.5.3

PACKAGE=bc
COMP=tar.gz
PRECONFSCRIPT="CC=gcc PREFIX=/usr ./configure.sh -O3"
SKIP_CONFIGURE=1

use_mod acmake

export SRC_URL=https://github.com/gavinhoward/bc/archive/$VERSION/$SRC