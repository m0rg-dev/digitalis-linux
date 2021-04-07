source ../lib.sh

export PACKAGE=host-bison
export VERSION=3.7.4
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh
    x10-import ./host-bash.sh

    fetch-source "bison-${VERSION}" "a3b5813f48a11e540ef26f46e4d288c0c25c7907d9879ae50e430ec49f63c010" \
        "https://ftpmirror.gnu.org/gnu/bison/bison-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/bison/bison-${VERSION}.tar.xz"
    setup-build-dirs "bison-${VERSION}"
    build-autoconf "bison-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)'

    fix-shebangs $(x10-hash-of ./host-bash.sh)
}
