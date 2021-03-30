source ../lib.sh

export PACKAGE=host-findutils
export VERSION=4.7.0
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "findutils-${VERSION}" "c5fefbdf9858f7e4feb86f036e1247a54c79fc2d8e4b7064d5aaa1f47dfa789a" \
        "https://ftpmirror.gnu.org/gnu/findutils/findutils-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/findutils/findutils-${VERSION}.tar.gz"
    setup-build-dirs "findutils-${VERSION}"
    build-autoconf "findutils-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)'
}
