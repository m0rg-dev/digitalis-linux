export BDEPEND="core/linux-headers>=3.2"
export SRC="glibc-2.31.tar.xz"

pkg_build() {
    echo "[sad trombone]"
    exit 1

    tar xfJ glibc-*.tar.xz
    rm glibc-*.tar.xz
    cd glibc-*

    mkdir -p build
    cd build

    ../configure --prefix=/usr --disable-werror --enable-kernel=3.2 --with-headers=/usr/include libc_cv_slibdir=/lib
    make 
    make -j1 DESTDIR=$(realpath ../..) install
    cp -v ../nscd/nscd.conf ../../etc/nscd.conf
    cd ../..
    rm -r glibc-*

    mkdir -pv var/cache/nscd
    
}