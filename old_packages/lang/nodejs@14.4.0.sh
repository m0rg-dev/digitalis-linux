export VERSION=14.4.0

export BDEPEND="lang/gcc util/make lang/python"

PACKAGE=node
export SRC=node-v$VERSION.tar.xz
export UNPACK_DIR=node-v$VERSION
export SRC_URL=https://nodejs.org/download/release/v$VERSION/$SRC

use_mod acmake
