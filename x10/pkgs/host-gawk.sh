source ../lib.sh

export PACKAGE=host-gawk
export VERSION=5.1.0
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "gawk-${VERSION}" "cf5fea4ac5665fd5171af4716baab2effc76306a9572988d5ba1078f196382bd" \
        "https://ftpmirror.gnu.org/gnu/gawk/gawk-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/gawk/gawk-${VERSION}.tar.gz"
    setup-build-dirs "gawk-${VERSION}"
    use-libtool-gcc-wrapper
    build-autoconf "gawk-${VERSION}" --host=$X10_TARGET --build='$(../config.guess)' 
}
