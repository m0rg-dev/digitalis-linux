export VERSION=2.31
export BDEPEND="kernel/linux-headers^3.2"

PACKAGE=glibc
UPSTREAM="http://ftp.gnu.org/gnu/"
USE_BUILD_DIR=1

CONFIG_OPTS="--prefix=/usr --disable-werror --enable-kernel=3.2 libc_cb_slibdir=/lib"
POSTINSTALLSCRIPT="
    cp -v \$UNPACK_DIR/nscd/nscd.conf etc/nscd.conf
    mkdir -pv var/cache/nscd lib64 usr/lib
    ln -sfv ../lib/ld-linux-x86-64.so.2 lib64
    ln -sfv ../lib/ld-linux-x86-64.so.2 lib64/ld-lsb-x86-64.so.3
    ln -sfv ../lib64/crt1.o usr/lib/crt1.o
    ln -sfv ../lib64/crti.o usr/lib/crti.o
    ln -sfv ../lib64/crtn.o usr/lib/crtn.o

    mkdir -p etc
    cat > etc/ld.so.conf << "EOF"
# Begin /etc/ld.so.conf
/usr/local/lib
/opt/lib

EOF
"

use_mod acmake
