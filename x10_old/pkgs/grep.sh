source ../lib.sh

PACKAGE=grep
VERSION=3.6

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./gcc.sh
    x10-import ./bash.sh

    fetch-source "grep-${VERSION}" "667e15e8afe189e93f9f21a7cd3a7b3f776202f417330b248c2ad4f997d9373e" \
        "https://ftpmirror.gnu.org/gnu/grep/grep-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/grep/grep-${VERSION}.tar.xz"
    setup-build-dirs "grep-${VERSION}"
    # TODO pcre
    build-autoconf --disable-perl-regexp
    fix-shebangs $(x10-hash-of ./bash.sh)
}
