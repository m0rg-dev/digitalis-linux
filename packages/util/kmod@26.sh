export VERSION=26

export BDEPEND="util/xz libs/zlib"
export RDEPEND="util/xz libs/zlib"

PACKAGE=kmod
UPSTREAM=https://www.kernel.org/pub/linux/utils/kernel/
CONFIG_OPTS="--prefix=/usr --bindir=/bin --sysconfdir=/etc --with-rootlibdir=/lib --with-xz --with-zlib"
POSTINSTALLSCRIPT="mkdir -p sbin
for target in depmod insmod lsmod modinfo modprobe rmmod; do
  ln -sfv ../bin/kmod sbin/\$target
done

ln -svf kmod bin/lsmod"

use_mod acmake