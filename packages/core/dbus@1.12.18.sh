export VERSION=1.12.18

export BDEPEND="libs/expat"
export RDEPEND="libs/expat"

PACKAGE=dbus
COMP=tar.gz
UPSTREAM=https://dbus.freedesktop.org/releases/
CONFIG_OPTS="--prefix=/usr --sysconfdir=/etc --localstatedir=/var"
POSTINSTALLSCRIPT="mkdir var/run/dbus"

use_mod acmake
