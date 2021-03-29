source ../lib.sh

export PACKAGE=host-patchelf
export VERSION=0.12
export INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh
    x10-import ./host-libstdc++.sh

    fetch-source "patchelf-${VERSION}" "699a31cf52211cf5ad6e35a8801eb637bc7f3c43117140426400d67b7babd792" \
        "https://github.com/NixOS/patchelf/releases/download/${VERSION}/patchelf-${VERSION}.tar.bz2"
    UNPACK_DIR="patchelf-${VERSION}.20200827.8d3a16e" setup-build-dirs "patchelf-${VERSION}"
    build-autoconf "patchelf-${VERSION}" --host=$X10_TARGET
}
