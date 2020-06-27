VERSION=8.32

export SRC=coreutils-$VERSION.tar.xz
export SRC_URL="http://ftp.gnu.org/gnu/coreutils/$SRC"

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    mkdir build
    cd build

    FORCE_UNSAFE_CONFIGURE=1 ../coreutils-$VERSION/configure --prefix=/usr --enable-no-install-program=kill,uptime
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r build coreutils-$VERSION
}