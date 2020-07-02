export VERSION=5.7.5

export SRC="linux-$VERSION.tar.xz"
export SRC_URL="https://cdn.kernel.org/pub/linux/kernel/v5.x/$SRC"

pkg_build() {
    tar xfJ $SRC
    rm $SRC
    cd linux-$VERSION

    make mrproper
    make headers
    find usr/include -name '.*' -delete
    rm usr/include/Makefile
    cd ..
    mkdir -p usr/include/
    cp -rv linux-$VERSION/usr/include/* usr/include
    rm -r linux-$VERSION
}