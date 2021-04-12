source ../lib.sh

export PACKAGE=host-kernel-headers
export VERSION=5.11.7
INHERIT_ENVIRONMENT=1

x10-generate() {
    fetch-source "linux-${VERSION}" "49b5f12c47e151c98e8dc11a22436940d2d4bf8f5b698ce54d685a24cd3ea8b1" \
        "https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-${VERSION}.tar.xz"
    setup-build-dirs "linux-${VERSION}"
    build-command make headers
    build-command find usr/include -name "'.*'" -delete
    build-command install -dm755 /tmp/$(x10-tree)/
    build-command cp -rv usr/include /tmp/$(x10-tree)/
}
