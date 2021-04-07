source ../lib.sh

export PACKAGE=host-ncurses
export VERSION=6.2
INHERIT_ENVIRONMENT=1
X10_PERMIT_EXTERNAL_INTERP=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh
    x10-import ./host-libstdc++.sh

    fetch-source "ncurses-${VERSION}" "30306e0c76e0f9f1f0de987cf1c82a5c21e1ce6568b9227f7da5b71cbea86c9d" \
        "https://ftpmirror.gnu.org/gnu/ncurses/ncurses-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/ncurses/ncurses-${VERSION}.tar.gz"
    setup-build-dirs "ncurses-${VERSION}"
    build-command mkdir build_tic
    build-command pushd build_tic
    build-command ../configure
    build-command make -C include -j'$(nproc)'
    build-command make -C progs tic -j'$(nproc)'
    build-command popd
    build-command export TIC_PATH='$(pwd)'/build_tic/progs/tic
    build-autoconf "ncurses-${VERSION}" --host=$X10_TARGET --build='$(../config.guess)' --with-manpage-format=normal --with-shared \
        --without-debug --without-ada --without-normal --enable-widec --target=$TARGET
    build-command echo 'INPUT\(-lncursesw\)' '>' $(x10-tree)/lib/libncurses.so
}
