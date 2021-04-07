source ../lib.sh

PACKAGE=attr
VERSION=2.4.48

INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import .//crossbuilt-sysroot.sh
    x10-import ./glibc.sh
    x10-import ./gcc.sh

    fetch-source "attr-${VERSION}" "5ead72b358ec709ed00bbf7a9eaef1654baad937c001c044fe8b74c57f5324e7" \
        "http://download.savannah.gnu.org/releases/attr/attr-${VERSION}.tar.gz"
    setup-build-dirs "attr-${VERSION}"
    use-libtool-gcc-wrapper
    build-autoconf --disable-static
}
