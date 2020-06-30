export VERSION=6.2.0

PACKAGE=gmp
UPSTREAM=http://ftp.gnu.org/gnu/
CONFIG_OPTS="--prefix=/usr --disable-static --enable-fat --build=x86_64-unknown-linux-gnu"
USE_BUILD_DIR=1
PRECONFSCRIPT="cp -v ../gmp-$VERSION/configfsf.guess ../gmp-$VERSION/config.guess
cp -v ../gmp-$VERSION/configfsf.sub   ../gmp-$VERSION/config.sub"

use_mod acmake
