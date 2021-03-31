source ../lib.sh

PACKAGE=kernel-headers
VERSION=5.11.7
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ../sysroot/crossbuilt-sysroot.sh

    fetch-source "linux-${VERSION}" "49b5f12c47e151c98e8dc11a22436940d2d4bf8f5b698ce54d685a24cd3ea8b1" \
        "https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-${VERSION}.tar.xz"
    setup-build-dirs "linux-${VERSION}"

    _defer _set_compiler_flags
    build-command 'export HOSTCFLAGS="$CFLAGS"'
    build-command 'export HOSTLDFLAGS="$LDFLAGS"'

    build-command make headers
    build-command find usr/include -name "'.*'" -delete
    build-command install -dm755 $(x10-tree)/
    build-command cp -rv usr/include $(x10-tree)/
}
