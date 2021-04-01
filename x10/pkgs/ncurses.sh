source ../lib.sh

PACKAGE=ncurses
VERSION=6.2

x10-generate() {
    x10-import ../sysroot/crossbuilt-sysroot.sh
    x10-import ./glibc.sh
    x10-import ./gcc.sh

    fetch-source "ncurses-${VERSION}" "30306e0c76e0f9f1f0de987cf1c82a5c21e1ce6568b9227f7da5b71cbea86c9d" \
        "https://ftpmirror.gnu.org/gnu/ncurses/ncurses-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/ncurses/ncurses-${VERSION}.tar.gz"
    setup-build-dirs "ncurses-${VERSION}"
    use-compiler-wrapper

    build-autoconf --with-manpage-format=normal --with-shared \
        --without-debug --without-ada --without-normal --enable-widec
    build-command echo 'INPUT\(-lncursesw\)' '>' $(x10-tree)/lib/libncurses.so
}
