export VERSION=2.04

PACKAGE=grub
UPSTREAM=http://ftp.gnu.org/gnu/
CONFIG_OPTS="--prefix=/usr --sbindir=/sbin --sysconfdir=/etc --disable-efiemu --disable-werror"

use_mod acmake

