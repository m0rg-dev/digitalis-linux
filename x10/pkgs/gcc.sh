source ../lib.sh

export PACKAGE=gcc
export VERSION=10.2.0

x10-generate() {
    x10-import-always ./binutils.sh
    x10-import-always ./glibc.sh
    x10-import .//crossbuilt-sysroot.sh
    x10-import ./gmp.sh
    x10-import ./mpfr.sh
    x10-import ./mpc.sh
    x10-import ./zlib.sh

    fetch-source "gcc-${VERSION}" "b8dd4368bb9c7f0b98188317ee0254dd8cc99d1e3a18d0ff146c855fe16c1d8c" \
        "https://ftpmirror.gnu.org/gnu/gcc/gcc-${VERSION}/gcc-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/gcc/gcc-${VERSION}/gcc-${VERSION}.tar.xz"
    setup-build-dirs "gcc-${VERSION}"
    use-libtool-gcc-wrapper

    build-command sed -e '/m64=/s/lib64/lib/' -i.orig gcc/config/i386/t-linux64
    build-command export OPTFLAGS="-B\$(dirname \$X10_DYNAMIC_LINKER | sed -e 's/lib64/lib/')"
    build-command export TARGET_CONFIGARGS=ac_has_fenv_h=no
    build-autoconf --with-system-zlib --enable-languages=c,c++ --disable-multilib --disable-bootstrap --without-zstd target_configargs='"ac_has_fenv_h=no ac_cv_header_fenv_h=no GLIBCXX_LIBS=-lc_nonshared"'
    build-command ln -svf gcc $(x10-tree)/bin/cc
}
