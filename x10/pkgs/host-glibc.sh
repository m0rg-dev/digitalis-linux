source ../lib.sh

export PACKAGE=host-glibc
export VERSION=2.33
INHERIT_ENVIRONMENT=1
X10_PERMIT_EXTERNAL_LIBS=1

x10-generate() {
    x10-import ./host-xbinutils.sh
    x10-import ./host-xgcc.sh
    x10-import-always ./host-kernel-headers.sh

    fetch-source "glibc-${VERSION}" "2e2556000e105dbd57f0b6b2a32ff2cf173bde4f0d85dffccfd8b7e51a0677ff" \
        "https://ftpmirror.gnu.org/gnu/glibc/glibc-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/glibc/glibc-${VERSION}.tar.xz"
    setup-build-dirs "glibc-${VERSION}"
    # build-command sed -e "'s/\& \~DF_1_NOW/\& \~(DF_1_NOW | DF_1_NODEFLIB)/'" -i elf/get-dynamic-info.h
    build-command INHIBIT_LOCAL_RPATH=1
    build-autoconf --host=$X10_TARGET --build=\$\(../scripts/config.guess\) --enable-kernel=5.0 \
        --with-headers=/x10/tree/$($X10 ./host-kernel-headers.sh hash)/include libc_cv_slibdir=$(x10-tree)/lib
    build-command mkdir -pv $(x10-tree)/lib64/
    build-command ln -sfv $(x10-tree)/lib/ld-linux-x86-64.so.2 $(x10-tree)/lib64/
}
