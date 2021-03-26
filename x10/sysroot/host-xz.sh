source ../lib.sh

export PACKAGE=host-xz
export VERSION=5.2.5
export INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "xz-${VERSION}" "3e1e518ffc912f86608a8cb35e4bd41ad1aec210df2a47aaa1f95e7f5576ef56" \
        "https://tukaani.org/xz/xz-${VERSION}.tar.xz"
    setup-build-dirs "xz-${VERSION}"
    use-libtool-gcc-wrapper
    build-autoconf "xz-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)' --disable-static
}
