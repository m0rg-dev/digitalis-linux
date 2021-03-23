source ../lib.sh

export PACKAGE=host-m4
export VERSION=1.4.18
export INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "m4-${VERSION}" "f2c1e86ca0a404ff281631bdc8377638992744b175afb806e25871a24a934e07" \
        "https://ftpmirror.gnu.org/gnu/m4/m4-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/m4/m4-${VERSION}.tar.xz"
    setup-build-dirs "m4-${VERSION}"
    build-command sed -i 's/IO_ftrylockfile/IO_EOF_SEEN/' lib/\*.c
    build-command echo "\#define _IO_IN_BACKUP 0x100" '>> lib/stdio-impl.h'
    build-autoconf "m4-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)'
}
