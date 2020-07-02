export VERSION=0.29.2

PACKAGE=pkg-config
COMP=tar.gz
CONFIG_OPTS="--prefix=/usr --with-internal-glib --disable-host-tool"

use_mod acmake

export SRC_URL=https://pkg-config.freedesktop.org/releases/$SRC
