export VERSION=1.45.5

PACKAGE=e2fsprogs
COMP=tar.gz
CONFIG_OPTS="--prefix=/usr           \
             --bindir=/bin           \
             --with-root-prefix=''   \
             --enable-elf-shlibs     \
             --disable-libblkid      \
             --disable-libuuid       \
             --disable-uuidd         \
             --disable-fsck"

use_mod acmake

export SRC_URL=https://downloads.sourceforge.net/project/e2fsprogs/e2fsprogs/v$VERSION/$SRC