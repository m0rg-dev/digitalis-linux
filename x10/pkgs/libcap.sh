source ../lib.sh

PACKAGE=libcap
VERSION=2.48

INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import .//crossbuilt-sysroot.sh
    x10-import ./glibc.sh
    x10-import ./gcc.sh

    fetch-source "libcap-${VERSION}" "4de9590ee09a87c282d558737ffb5b6175ccbfd26d580add10df44d0f047f6c2" \
        "https://www.kernel.org/pub/linux/libs/security/linux-privs/libcap2/libcap-${VERSION}.tar.xz"
    setup-build-dirs "libcap-${VERSION}"
    build-command sed -i "'/install -m.*STA/d'" libcap/Makefile
    use-libtool-gcc-wrapper
    build-command 'export BUILD_CC=$CC'
    build-command make prefix=$(x10-tree) lib=lib
    build-command make install prefix=$(x10-tree) lib=lib
}
