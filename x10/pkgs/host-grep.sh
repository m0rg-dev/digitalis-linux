source ../lib.sh

export PACKAGE=host-grep
export VERSION=3.6
INHERIT_ENVIRONMENT=1
X10_PERMIT_EXTERNAL_INTERP=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "grep-${VERSION}" "667e15e8afe189e93f9f21a7cd3a7b3f776202f417330b248c2ad4f997d9373e" \
        "https://ftpmirror.gnu.org/gnu/grep/grep-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/grep/grep-${VERSION}.tar.gz"
    setup-build-dirs "grep-${VERSION}"
    build-autoconf "grep-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)' --without-pcre
}
