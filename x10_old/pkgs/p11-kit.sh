source ../lib.sh

PACKAGE=p11-kit
VERSION=0.23.22

x10-generate() {
    x10-import ./sysroot.sh
    x10-import ./gcc.sh
    x10-import ./pkgconf.sh
    x10-import ./libtasn1.sh
    x10-import ./libffi.sh
    x10-import ./bash.sh

    fetch-source "p11-kit-${VERSION}" "8a8f40153dd5a3f8e7c03e641f8db400133fb2a6a9ab2aee1b6d0cb0495ec6b6" \
        "https://github.com/p11-glue/p11-kit/releases/download/${VERSION}/p11-kit-${VERSION}.tar.xz"
    setup-build-dirs "p11-kit-${VERSION}"
    build-command sed "'20,$ d'" -i trust/trust-extract-compat
    use-compiler-wrapper
    build-autoconf --with-trust-paths=$(x10-tree)/etc/pki/anchors
    fix-shebangs $(x10-hash-of ./bash.sh)
}
