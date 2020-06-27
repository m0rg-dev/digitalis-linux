export VERSION=6.2.0

PACKAGE=gmp
UPSTREAM=http://ftp.gnu.org/gnu/
CONFIG_OPTS="--prefix=/usr --disable-static"
USE_BUILD_DIR=1

use_mod acmake
