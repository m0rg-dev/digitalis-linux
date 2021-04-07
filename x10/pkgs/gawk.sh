source ../lib.sh

PACKAGE=gawk
VERSION=5.1.0

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./gcc.sh

    fetch-source "gawk-${VERSION}" "cf5fea4ac5665fd5171af4716baab2effc76306a9572988d5ba1078f196382bd" \
        "https://ftpmirror.gnu.org/gnu/gawk/gawk-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/gawk/gawk-${VERSION}.tar.gz"
    setup-build-dirs "gawk-${VERSION}"
    use-compiler-wrapper
    build-autoconf
}
