source ../lib.sh

PACKAGE=make
VERSION=4.3

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh

    fetch-source "make-${VERSION}" "e05fdde47c5f7ca45cb697e973894ff4f5d79e13b750ed57d7b66d8defc78e19" \
        "https://ftpmirror.gnu.org/gnu/make/make-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/make/make-${VERSION}.tar.gz"
    setup-build-dirs "make-${VERSION}"
    build-autoconf --without-guile
}
