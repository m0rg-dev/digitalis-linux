export VERSION=1.8

export BDEPEND="libs/readline core/dbus"
export RDEPEND="libs/readline core/dbus"

PACKAGE=iwd
CONFIG_OPTS="--disable-systemd-service --prefix=/usr --sysconfdir=/etc/iwd --localstatedir=/var"
MAKEOPTS="$MAKEOPTS LIBS=-lncursesw"
use_mod acmake

export SRC_URL=https://mirrors.edge.kernel.org/pub/linux/network/wireless/$SRC