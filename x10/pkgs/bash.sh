source ../lib.sh

PACKAGE=bash
VERSION=5.1

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./glibc.sh
    x10-import ./gcc.sh
    x10-import ./ncurses.sh

    fetch-source "bash-${VERSION}" "cc012bc860406dcf42f64431bcd3d2fa7560c02915a601aba9cd597a39329baa" \
        "https://ftpmirror.gnu.org/gnu/bash/bash-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/bash/bash-${VERSION}.tar.gz"
    setup-build-dirs "bash-${VERSION}"
    use-compiler-wrapper
    # that's right, it's a race condition!
    MAKE_JOBS=-j1 build-autoconf --without-bash-malloc --with-curses
    build-command ln -svf bash $(x10-tree)/bin/sh

    fix-shebangs \$X10_PKGID
}
