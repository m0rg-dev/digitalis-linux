export VERSION=4.7.0

PACKAGE=findutils
USE_BUILD_DIR=1
CONFIG_OPTS="--prefix=/usr --localstatedir=/var/lib/locate"
UPSTREAM=http://ftp.gnu.org/gnu/
POSTINSTALLSCRIPT="
    mkdir -p bin
    mv -v usr/bin/find bin
    sed -i 's|find:=\${BINDIR}|find:=/bin|' usr/bin/updatedb
"

use_mod acmake
