VERSION=9.3.0

export BDEPEND="core/gmp^6.2.0 core/mpc^1.1.0 core/mpfr^4.0.2"
export SRC=gcc-$VERSION.tar.xz
export SRC_URL="http://ftp.gnu.org/gnu/gcc/gcc-$VERSION/$SRC"

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    sed -e '/m64=/s/lib64/lib/' \
        -i.orig gcc-$VERSION/gcc/config/i386/t-linux64

    mkdir build
    cd build
    ../gcc-$VERSION/configure --prefix=/usr \
             --enable-languages=c,c++       \
             --disable-multilib             \
             --disable-bootstrap            \
             --with-system-zlib
    
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install
    mkdir -p ../lib
    ln -sv ../usr/bin/cpp ../lib/
    ln -sv gcc ../usr/bin/cc
    install -v -dm755 ../usr/lib/bfd-plugins
    ln -sfv ../../libexec/gcc/$(gcc -dumpmachine)/9.2.0/liblto_plugin.so \
        ../usr/lib/bfd-plugins/
    mkdir -pv ../usr/share/gdb/auto-load/usr/lib
    mv -v ../usr/lib/*gdb.py ../usr/share/gdb/auto-load/usr/lib

    cd ..
    rm -r build gcc-$VERSION
}