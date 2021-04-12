source ../lib.sh

export PACKAGE=host-diffutils
export VERSION=3.7
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "diffutils-${VERSION}" "b3a7a6221c3dc916085f0d205abf6b8e1ba443d4dd965118da364a1dc1cb3a26" \
        "https://ftpmirror.gnu.org/gnu/diffutils/diffutils-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/diffutils/diffutils-${VERSION}.tar.xz"
    setup-build-dirs "diffutils-${VERSION}"
    build-autoconf "diffutils-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)'
}
