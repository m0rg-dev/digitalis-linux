source ../lib.sh

PACKAGE=texinfo
VERSION=6.7

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./bash.sh
    x10-import-always ./perl.sh

    fetch-source "texinfo-${VERSION}" "a52d05076b90032cb2523673c50e53185938746482cf3ca0213e9b4b50ac2d3e" \
        "https://ftpmirror.gnu.org/gnu/texinfo/texinfo-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/texinfo/texinfo-${VERSION}.tar.gz"
    setup-build-dirs "texinfo-${VERSION}"
    # crappy hack
    build-command sed -e 's/=\"tinfo/=\"/' -i configure
    build-autoconf --disable-perl-xs --disable-texindex

    fix-shebangs $(x10-hash-of ./bash.sh)
}
