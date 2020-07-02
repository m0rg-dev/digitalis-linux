export VERSION=3.8.3

PACKAGE=Python
CONFIG_OPTS="--prefix=/usr --with-ensurepip=yes"

use_mod acmake

export SRC_URL=https://www.python.org/ftp/python/$VERSION/$SRC