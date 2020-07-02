export VERSION=8.32

export BDEPEND="libs/libattr"
export RDEPEND="libs/gmp libs/libattr"

PACKAGE=coreutils
USE_BUILD_DIR=1
CONFIG_OPTS="--prefix=/usr --enable-no-install-program=kill,uptime"
UPSTREAM=http://ftp.gnu.org/gnu/

export FORCE_UNSAFE_CONFIGURE=1
use_mod acmake
