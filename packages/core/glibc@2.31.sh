export BDEPEND="core/linux-headers^3.2"
export SRC="glibc-2.31.tar.xz"
export SRC_URL="http://ftp.gnu.org/gnu/glibc/glibc-2.31.tar.xz"

pkg_build() {
    tar xfJ glibc-*.tar.xz
    rm glibc-*.tar.xz
    cd glibc-*

    mkdir -p build
    cd build

    ../configure --prefix=/usr --disable-werror --enable-kernel=3.2 --with-headers=/usr/include libc_cv_slibdir=/lib
    make $MAKEOPTS
    make DESTDIR=$(realpath ../..) install

    cp -v ../nscd/nscd.conf ../../etc/nscd.conf
    cd ../..
    rm -r glibc-*

    mkdir -pv var/cache/nscd lib64
    ln -sfv ../lib/ld-linux-x86-64.so.2 lib64
    ln -sfv ../lib/ld-linux-x86-64.so.2 lib64/ld-lsb-x86-64.so.3

    mkdir -p etc
    cat > etc/ld.so.conf << "EOF"
# Begin /etc/ld.so.conf
/usr/local/lib
/opt/lib

EOF
}