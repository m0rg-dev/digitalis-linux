source ../lib.sh

export PACKAGE=glibc
export VERSION=2.33

x10-generate() {
    x10-import .//crossbuilt-sysroot.sh
    x10-import-always ./kernel-headers.sh

    fetch-source "glibc-${VERSION}" "2e2556000e105dbd57f0b6b2a32ff2cf173bde4f0d85dffccfd8b7e51a0677ff" \
        "https://ftpmirror.gnu.org/gnu/glibc/glibc-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/glibc/glibc-${VERSION}.tar.xz"
    setup-build-dirs "glibc-${VERSION}"
    build-command sed -e "'s/\& \~DF_1_NOW/\& \~(DF_1_NOW | DF_1_NODEFLIB)/'" -i elf/get-dynamic-info.h

    # configure doesn't pass CXXFLAGS while trying to find some headers
    build-command echo -e '"#!/bin/sh\n$X10_TARGET-g++ "'@\$\(realpath -m build/optflags.txt\)'" \"\$@\""' '>' g++wrap
    build-command chmod +x g++wrap
    build-command export CXX='$(realpath g++wrap)'
    
    build-autoconf --enable-kernel=5.0 --without-selinux --enable-stack-protector=strong \
        --with-headers=/x10/tree/$($X10 .//host-kernel-headers.sh hash)/include libc_cv_slibdir=$(x10-tree)/lib
    build-command patchelf --force-rpath --remove-rpath $(x10-tree)/lib/ld-${VERSION}.so
    build-command mkdir -pv $(x10-tree)/lib64/
    build-command ln -sfrv $(x10-tree)/lib/ld-linux-x86-64.so.2 $(x10-tree)/lib64/
}
