source ../lib.sh

PACKAGE=coreutils
VERSION=8.32

INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import .//crossbuilt-sysroot.sh
    x10-import ./glibc.sh
    x10-import ./gcc.sh
    x10-import ./attr.sh
    x10-import ./libcap.sh

    fetch-source "coreutils-${VERSION}" "4458d8de7849df44ccab15e16b1548b285224dbba5f08fac070c1c0e0bcc4cfa" \
        "https://ftpmirror.gnu.org/gnu/coreutils/coreutils-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/coreutils/coreutils-${VERSION}.tar.xz"
    setup-build-dirs "coreutils-${VERSION}"
    build-autoconf --enable-install-program=hostname --without-selinux
}
