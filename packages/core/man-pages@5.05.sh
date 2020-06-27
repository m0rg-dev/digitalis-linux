VERSION=5.05

export SRC=man-pages-$VERSION.tar.xz
export SRC_URL="https://www.kernel.org/pub/linux/docs/man-pages/$SRC"

pkg_build() {
    tar xfJ $SRC
    rm $SRC
    cd man-pages-$VERSION

    make DESTDIR=$(realpath ..) install
    cd ..
    rm -r man-pages-$VERSION
}