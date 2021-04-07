source ../lib.sh

PACKAGE=tar
VERSION=1.34

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./acl.sh

    fetch-source "tar-${VERSION}" "63bebd26879c5e1eea4352f0d03c991f966aeb3ddeb3c7445c902568d5411d28" \
        "https://ftpmirror.gnu.org/gnu/tar/tar-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/tar/tar-${VERSION}.tar.gz"
    setup-build-dirs "tar-${VERSION}"
    build-autoconf --without-selinux
}
