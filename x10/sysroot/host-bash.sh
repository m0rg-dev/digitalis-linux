source ../lib.sh

PACKAGE=host-bash
VERSION=5.1
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh
    x10-import ./host-ncurses.sh

    fetch-source "bash-${VERSION}" "cc012bc860406dcf42f64431bcd3d2fa7560c02915a601aba9cd597a39329baa" \
        "https://ftpmirror.gnu.org/gnu/bash/bash-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/bash/bash-${VERSION}.tar.gz"
    setup-build-dirs "bash-${VERSION}"
    # that's right, it's a race condition!
    MAKE_JOBS=-j1 build-autoconf "bash-${VERSION}" --host=$X10_TARGET --build='$(../support/config.guess)' --without-bash-malloc
    build-command ln -svf bash $(x10-tree)/bin/sh
}
