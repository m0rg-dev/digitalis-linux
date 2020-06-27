export VERSION=6.2

export SRC=ncurses-$VERSION.tar.gz
export SRC_URL="http://ftp.gnu.org/gnu/ncurses/$SRC"

pkg_build() {
    tar xfz $SRC
    rm $SRC

    cd ncurses-$VERSION
    ./configure --prefix=/usr       \
            --mandir=/usr/share/man \
            --with-shared           \
            --without-debug         \
            --without-normal        \
            --enable-pc-files       \
            --enable-widec

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    mkdir -pv      ../usr/share/doc/ncurses-6.2
    cp -v -R doc/* ../usr/share/doc/ncurses-6.2

    cd ..
    mkdir -p lib usr/lib/pkgconfig
    mv -v usr/lib/libncursesw.so.6* lib
    ln -sfv ../../lib/$(readlink usr/lib/libncursesw.so) usr/lib/libncursesw.so

    for lib in ncurses form panel menu ; do
        rm -vf                    usr/lib/lib${lib}.so
        echo "INPUT(-l${lib}w)" > usr/lib/lib${lib}.so
        ln -sfv ${lib}w.pc        usr/lib/pkgconfig/${lib}.pc
    done

    rm -vf                     usr/lib/libcursesw.so
    echo "INPUT(-lncursesw)" > usr/lib/libcursesw.so
    ln -sfv libncurses.so      usr/lib/libcurses.so

    rm -r ncurses-$VERSION
    ldconfig -N -r .
}