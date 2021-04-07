source ../lib.sh

PACKAGE=python
BASEVER=3.9
VERSION=$BASEVER.0

x10-generate() {
    x10-import ./crossbuilt-sysroot.sh
    x10-import ./gcc.sh
    x10-import ./bash.sh
    x10-import ./xz.sh

    fetch-source "Python-${VERSION}" "9c73e63c99855709b9be0b3cc9e5b072cb60f37311e8c4e50f15576a0bf82854" \
        "https://www.python.org/ftp/python/${VERSION}/Python-${VERSION}.tar.xz"
    setup-build-dirs "Python-${VERSION}"
    use-compiler-wrapper
    build-autoconf
    fix-shebangs $(x10-hash-of ./bash.sh)
    build-command sed -i 1s@/usr/local/bin/python@$(x10-tree)/bin/python3@ $(x10-tree)/lib/python$BASEVER/cgi.py
}
