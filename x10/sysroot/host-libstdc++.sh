source ../lib.sh

export PACKAGE=host-libstdc++
export VERSION=10.2.0
export INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "gcc-${VERSION}" "b8dd4368bb9c7f0b98188317ee0254dd8cc99d1e3a18d0ff146c855fe16c1d8c" \
        "https://ftpmirror.gnu.org/gnu/gcc/gcc-${VERSION}/gcc-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/gcc/gcc-${VERSION}/gcc-${VERSION}.tar.xz"
    setup-build-dirs "gcc-${VERSION}"
    use-libtool-gcc-wrapper
    CONFIGURE=../libstdc++-v3/configure build-autoconf "gcc-${VERSION}" --host=$X10_TARGET --target=$X10_TARGET --build='$(../config.guess)' \
        --disable-multilib --disable-nls --disable-libstdcxx-pch glibcxx_cv_sys_sdt_h=no
    build-command mv $(x10-tree)/include/c++/${VERSION}/* $(x10-tree)/include/
}
