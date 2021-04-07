source ../lib.sh

export PACKAGE=host-gzip
export VERSION=1.10
INHERIT_ENVIRONMENT=1
X10_PERMIT_EXTERNAL_INTERP=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "gzip-${VERSION}" "8425ccac99872d544d4310305f915f5ea81e04d0f437ef1a230dc9d1c819d7c0" \
        "https://ftpmirror.gnu.org/gnu/gzip/gzip-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/gzip/gzip-${VERSION}.tar.gz"
    setup-build-dirs "gzip-${VERSION}"
    build-autoconf "gzip-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)'
}
