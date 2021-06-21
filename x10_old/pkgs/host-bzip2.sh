source ../lib.sh

export PACKAGE=host-bzip2
export VERSION=1.0.8
INHERIT_ENVIRONMENT=1
X10_PERMIT_EXTERNAL_INTERP=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "bzip2-${VERSION}" "ab5a03176ee106d3f0fa90e381da478ddae405918153cca248e682cd0c4a2269" \
        "https://www.sourceware.org/pub/bzip2/bzip2-${VERSION}.tar.gz"
    setup-build-dirs "bzip2-${VERSION}"
    use-compiler-wrapper
    build-command make -f Makefile-libbz2_so CC=\$CC
    build-command make clean
    build-command make CC=\$CC
    build-command make PREFIX=/tmp/$(x10-tree) install
    build-command rm /tmp/$(x10-tree)/bin/{bzcmp,bzegrep,bzfgrep,bzless}
}
