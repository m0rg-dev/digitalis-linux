export VERSION=2.6.4
export BDEPEND="util/libtool^2.4"
PACKAGE=flex
COMP=tar.gz
PRECONFSCRIPT="./autogen.sh"

use_mod acmake

export SRC_URL=https://github.com/westes/flex/releases/download/v$VERSION/$SRC