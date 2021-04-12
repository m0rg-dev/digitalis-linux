source ../lib.sh

PACKAGE=which
VERSION=2.21

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./gcc.sh

    fetch-source "which-${VERSION}" "f4a245b94124b377d8b49646bf421f9155d36aa7614b6ebf83705d3ffc76eaad" \
        "https://carlowood.github.io/which/which-${VERSION}.tar.gz"
    setup-build-dirs "which-${VERSION}"
    build-autoconf
}
