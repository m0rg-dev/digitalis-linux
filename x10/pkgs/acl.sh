source ../lib.sh

PACKAGE=acl
VERSION=2.2.53

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh

    fetch-source "acl-${VERSION}" "06be9865c6f418d851ff4494e12406568353b891ffe1f596b34693c387af26c7" \
        "http://download.savannah.gnu.org/releases/acl/acl-${VERSION}.tar.gz"
    setup-build-dirs "acl-${VERSION}"
    use-compiler-wrapper
    build-autoconf --disable-static
}
