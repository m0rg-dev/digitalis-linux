export VERSION=0.180

PACKAGE=elfutils
COMP=tar.bz2
CONFIG_OPTS="--prefix=/usr --disable-debuginfod"
INSTALLSCRIPT="
echo PWD = $(pwd)
echo REALPATH . = $(realpath .)
echo REALPATH .. = $(realpath ..)

make -C libelf DESTDIR=$(realpath .) install
mkdir -p $(realpath .)/usr/lib/pkgconfig
install -vm644 config/libelf.pc $(realpath .)/usr/lib/pkgconfig
rm $(realpath .)/usr/lib/libelf.a"

use_mod acmake

export SRC_URL=https://sourceware.org/ftp/elfutils/$VERSION/$SRC