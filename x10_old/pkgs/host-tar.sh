source ../lib.sh

export PACKAGE=host-tar
export VERSION=1.34
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "tar-${VERSION}" "63bebd26879c5e1eea4352f0d03c991f966aeb3ddeb3c7445c902568d5411d28" \
        "https://ftpmirror.gnu.org/gnu/tar/tar-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/tar/tar-${VERSION}.tar.xz"
    setup-build-dirs "tar-${VERSION}"
    build-autoconf "tar-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)'
}
