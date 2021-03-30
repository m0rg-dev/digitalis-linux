source ../lib.sh

export PACKAGE=host-make
export VERSION=4.3
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "make-${VERSION}" "e05fdde47c5f7ca45cb697e973894ff4f5d79e13b750ed57d7b66d8defc78e19" \
        "https://ftpmirror.gnu.org/gnu/make/make-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/make/make-${VERSION}.tar.gz"
    setup-build-dirs "make-${VERSION}"
    build-autoconf "make-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)' --without-guile
}
