source ../lib.sh

PACKAGE=perl
VERSION=5.32.0

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh

    fetch-source "perl-${VERSION}" "efeb1ce1f10824190ad1cadbcccf6fdb8a5d37007d0100d2d9ae5f2b5900c0b4" \
        "https://www.cpan.org/src/5.0/perl-${VERSION}.tar.gz"
    setup-build-dirs "perl-${VERSION}"
    use-compiler-wrapper
    build-command sh Configure -des -Dprefix=$(x10-tree) \
        -Dlibs='"-lm -lpthread"' \
        -Dvendorprefix=$(x10-tree) \
        -Duseshrplib \
        -Dusethreads \
        -Dcc=\$CC
    build-command make -j'$(nproc)'
    build-command make install
}