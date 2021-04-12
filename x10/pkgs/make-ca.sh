source ../lib.sh

PACKAGE=make-ca
VERSION=1.7

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./p11-kit.sh

    fetch-source "make-ca-${VERSION}" "6db8b96c961790507c5e36e0ed75a079ae95300f520cd88ac061cf44a4733c2f" \
        "https://github.com/djlucas/make-ca/releases/download/v${VERSION}/make-ca-${VERSION}.tar.xz"
    setup-build-dirs "make-ca-${VERSION}"
    build-command chmod +x make-ca
    build-command ./make-ca -g -D /tmp/$(x10-tree)
    build-command chmod 644 /tmp/$(x10-tree)/etc/ssl/certs/\*
    build-command chmod 755 /tmp/$(x10-tree)/etc/ssl/certs
}
