VERSION=5.05

export SRC=man-pages-$VERSION.tar.xz
export SRC_URL="https://www.kernel.org/pub/linux/docs/man-pages/man-pages-5.05.tar.xz"

pkg_build() {
    tar xfJ man-pages-$VERSION.tar.xz
    rm man-pages-$VERSION.tar.xz
    cd man-pages-$VERSION

    make DESTDIR=$(realpath ..) install
    cd ..
    rm -r man-pages-$VERSION
}