source ../lib.sh

PACKAGE=sed
VERSION=4.8

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./gcc.sh

    fetch-source "sed-${VERSION}" "f79b0cfea71b37a8eeec8490db6c5f7ae7719c35587f21edb0617f370eeff633" \
        "https://ftpmirror.gnu.org/gnu/sed/sed-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/sed/sed-${VERSION}.tar.gz"
    setup-build-dirs "sed-${VERSION}"
    build-autoconf --without-selinux
}
