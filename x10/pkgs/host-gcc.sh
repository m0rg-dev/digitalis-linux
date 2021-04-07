source ../lib.sh

export PACKAGE=host-gcc
export VERSION=10.2.0
INHERIT_ENVIRONMENT=1
X10_PERMIT_EXTERNAL_INTERP=1

MPC=1.2.1
MPFR=4.1.0
GMP=6.2.1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh
    x10-import ./host-libstdc++.sh

    fetch-source "gcc-${VERSION}" "b8dd4368bb9c7f0b98188317ee0254dd8cc99d1e3a18d0ff146c855fe16c1d8c" \
        "https://ftpmirror.gnu.org/gnu/gcc/gcc-${VERSION}/gcc-${VERSION}.tar.xz" \
        "https://ftp.gnu.org/gnu/gcc/gcc-${VERSION}/gcc-${VERSION}.tar.xz"
    fetch-source "mpc-${MPC}" "17503d2c395dfcf106b622dc142683c1199431d095367c6aacba6eec30340459" \
        "https://ftpmirror.gnu.org/gnu/mpc/mpc-${MPC}.tar.gz" \
        "https://ftp.gnu.org/gnu/mpc/mpc-${MPC}.tar.gz"
    fetch-source "mpfr-${MPFR}" "0c98a3f1732ff6ca4ea690552079da9c597872d30e96ec28414ee23c95558a7f" \
        "https://ftpmirror.gnu.org/gnu/mpfr/mpfr-${MPFR}.tar.xz" \
        "https://ftp.gnu.org/gnu/mpfr/mpfr-${MPFR}.tar.xz"
    fetch-source "gmp-${GMP}" "fd4829912cddd12f84181c3451cc752be224643e87fac497b69edddadc49b4f2" \
        "https://ftpmirror.gnu.org/gnu/gmp/gmp-${GMP}.tar.xz" \
        "https://ftp.gnu.org/gnu/gmp/gmp-${GMP}.tar.xz"
    setup-build-dirs "gcc-${VERSION}"
    use-libtool-gcc-wrapper
    build-command export CC_FOR_TARGET='$(realpath gccwrap)'
    build-command export CXX_FOR_TARGET='$(realpath g++wrap)'
    build-command tar xfa ${SOURCES[mpc-${MPC}]}
    build-command tar xfa ${SOURCES[mpfr-${MPFR}]}
    build-command tar xfa ${SOURCES[gmp-${GMP}]}
    build-command mv mpc-${MPC} mpc
    build-command mv mpfr-${MPFR} mpfr
    build-command mv gmp-${GMP} gmp
    build-command sed -e '/m64=/s/lib64/lib/' -i.orig gcc/config/i386/t-linux64
    build-command mkdir -pv $X10_TARGET/libgcc
    build-command ln -sv ../../../libgcc/gthr-posix.h $X10_TARGET/libgcc/gthr-default.h
    build-autoconf --host=$X10_TARGET --build='$(../config.guess)' \
        --disable-initfini-array --disable-nls --disable-multilib --disable-decimal-float --disable-libatomic \
        --disable-libgomp --disable-libquadmath --disable-libssp --disable-libvtv --disable-libstdcxx \
        --enable-languages=c,c++
    build-command ln -svf gcc $(x10-tree)/bin/cc
}
