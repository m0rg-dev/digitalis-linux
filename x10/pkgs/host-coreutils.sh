source ../lib.sh

export PACKAGE=host-coreutils
export VERSION=8.32
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "coreutils-${VERSION}" "4458d8de7849df44ccab15e16b1548b285224dbba5f08fac070c1c0e0bcc4cfa" \
        "https://ftpmirror.gnu.org/gnu/coreutils/coreutils-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/coreutils/coreutils-${VERSION}.tar.xz"
    setup-build-dirs "coreutils-${VERSION}"
    build-autoconf "coreutils-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)' --enable-install-program=hostname
}
