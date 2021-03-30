source lib.sh

export PACKAGE=bootstrap
export VERSION=1

BINUTILS=2.36
GCC=10.2.0
KERNEL=5.11.7
GLIBC=2.33
COREUTILS=8.32
TAR=1.34
XZ=5.2.5
PERL=5.32.1
SED=4.8
GREP=3.6
GAWK=5.1.0
MAKE=4.3
DIFFUTILS=3.7
TEXINFO=6.7
MPC=1.2.1
MPFR=4.1.0
GMP=6.2.1
ZLIB=1.2.11
BASH=5.1
FINDUTILS=4.7.0
GZIP=1.10
NCURSES=6.2
M4=1.4.18
BISON=3.7.4
PYTHON=3.9.0
LIBTOOL=2.4.6

fetch() {
    fetch-source "binutils-${BINUTILS}" "5788292cc5bbcca0848545af05986f6b17058b105be59e99ba7d0f9eb5336fb8" \
        "https://ftpmirror.gnu.org/gnu/binutils/binutils-${BINUTILS}.tar.xz" \
        "https://ftp.gnu.org/gnu/binutils/binutils-${BINUTILS}.tar.xz"
    fetch-source "gcc-${GCC}" "b8dd4368bb9c7f0b98188317ee0254dd8cc99d1e3a18d0ff146c855fe16c1d8c" \
        "https://ftpmirror.gnu.org/gnu/gcc/gcc-${GCC}/gcc-${GCC}.tar.xz" \
        "https://ftp.gnu.org/gnu/gcc/gcc-${GCC}/gcc-${GCC}.tar.xz"
    fetch-source "linux-${KERNEL}" "49b5f12c47e151c98e8dc11a22436940d2d4bf8f5b698ce54d685a24cd3ea8b1" \
        "https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-${KERNEL}.tar.xz"
    fetch-source "glibc-${GLIBC}" "2e2556000e105dbd57f0b6b2a32ff2cf173bde4f0d85dffccfd8b7e51a0677ff" \
        "https://ftpmirror.gnu.org/gnu/glibc/glibc-${GLIBC}.tar.xz" \
        "https://ftp.gnu.org/gnu/glibc/glibc-${GLIBC}.tar.xz"
    fetch-source "coreutils-${COREUTILS}" "4458d8de7849df44ccab15e16b1548b285224dbba5f08fac070c1c0e0bcc4cfa" \
        "https://ftpmirror.gnu.org/gnu/coreutils/coreutils-${COREUTILS}.tar.xz" \
        "https://ftp.gnu.org/gnu/coreutils/coreutils-${COREUTILS}.tar.xz"
    fetch-source "tar-${TAR}" "63bebd26879c5e1eea4352f0d03c991f966aeb3ddeb3c7445c902568d5411d28" \
        "https://ftpmirror.gnu.org/gnu/tar/tar-${TAR}.tar.xz" \
        "https://ftp.gnu.org/gnu/tar/tar-${TAR}.tar.xz"
    fetch-source "xz-${XZ}" "3e1e518ffc912f86608a8cb35e4bd41ad1aec210df2a47aaa1f95e7f5576ef56" \
        "https://tukaani.org/xz/xz-${XZ}.tar.xz"
    fetch-source "perl-${PERL}" "03b693901cd8ae807231b1787798cf1f2e0b8a56218d07b7da44f784a7caeb2c" \
        "https://www.cpan.org/src/5.0/perl-${PERL}.tar.gz"
    fetch-source "sed-${SED}" "f79b0cfea71b37a8eeec8490db6c5f7ae7719c35587f21edb0617f370eeff633" \
        "https://ftpmirror.gnu.org/gnu/sed/sed-${SED}.tar.xz" \
        "https://ftp.gnu.org/gnu/sed/sed-${SED}.tar.xz"
    fetch-source "grep-${GREP}" "667e15e8afe189e93f9f21a7cd3a7b3f776202f417330b248c2ad4f997d9373e" \
        "https://ftpmirror.gnu.org/gnu/grep/grep-${GREP}.tar.xz" \
        "https://ftp.gnu.org/gnu/grep/grep-${GREP}.tar.xz"
    fetch-source "gawk-${GAWK}" "cf5fea4ac5665fd5171af4716baab2effc76306a9572988d5ba1078f196382bd" \
        "https://ftpmirror.gnu.org/gnu/gawk/gawk-${GAWK}.tar.xz" \
        "https://ftp.gnu.org/gnu/gawk/gawk-${GAWK}.tar.xz"
    fetch-source "make-${MAKE}" "e05fdde47c5f7ca45cb697e973894ff4f5d79e13b750ed57d7b66d8defc78e19" \
        "https://ftpmirror.gnu.org/gnu/make/make-${MAKE}.tar.gz" \
        "https://ftp.gnu.org/gnu/make/make-${MAKE}.tar.gz"
    fetch-source "diffutils-${DIFFUTILS}" "b3a7a6221c3dc916085f0d205abf6b8e1ba443d4dd965118da364a1dc1cb3a26" \
        "https://ftpmirror.gnu.org/gnu/diffutils/diffutils-${DIFFUTILS}.tar.xz" \
        "https://ftp.gnu.org/gnu/diffutils/diffutils-${DIFFUTILS}.tar.xz"
    fetch-source "texinfo-${TEXINFO}" "988403c1542d15ad044600b909997ba3079b10e03224c61188117f3676b02caa" \
        "https://ftpmirror.gnu.org/gnu/texinfo/texinfo-${TEXINFO}.tar.xz" \
        "https://ftp.gnu.org/gnu/texinfo/texinfo-${TEXINFO}.tar.xz"
    fetch-source "mpc-${MPC}" "17503d2c395dfcf106b622dc142683c1199431d095367c6aacba6eec30340459" \
        "https://ftpmirror.gnu.org/gnu/mpc/mpc-${MPC}.tar.gz" \
        "https://ftp.gnu.org/gnu/mpc/mpc-${MPC}.tar.gz"
    fetch-source "mpfr-${MPFR}" "0c98a3f1732ff6ca4ea690552079da9c597872d30e96ec28414ee23c95558a7f" \
        "https://ftpmirror.gnu.org/gnu/mpfr/mpfr-${MPFR}.tar.xz" \
        "https://ftp.gnu.org/gnu/mpfr/mpfr-${MPFR}.tar.xz"
    fetch-source "zlib-${ZLIB}" "4ff941449631ace0d4d203e3483be9dbc9da454084111f97ea0a2114e19bf066" \
        "https://zlib.net/zlib-${ZLIB}.tar.xz"
    fetch-source "gmp-${GMP}" "fd4829912cddd12f84181c3451cc752be224643e87fac497b69edddadc49b4f2" \
        "https://ftpmirror.gnu.org/gnu/gmp/gmp-${GMP}.tar.xz" \
        "https://ftp.gnu.org/gnu/gmp/gmp-${GMP}.tar.xz"
    fetch-source "bash-${BASH}" "cc012bc860406dcf42f64431bcd3d2fa7560c02915a601aba9cd597a39329baa" \
        "https://ftpmirror.gnu.org/gnu/bash/bash-${BASH}.tar.gz" \
        "https://ftp.gnu.org/gnu/bash/bash-${BASH}.tar.gz"
    fetch-source "findutils-${FINDUTILS}" "c5fefbdf9858f7e4feb86f036e1247a54c79fc2d8e4b7064d5aaa1f47dfa789a" \
        "https://ftpmirror.gnu.org/gnu/findutils/findutils-${FINDUTILS}.tar.xz" \
        "https://ftp.gnu.org/gnu/findutils/findutils-${FINDUTILS}.tar.xz"
    fetch-source "gzip-${GZIP}" "8425ccac99872d544d4310305f915f5ea81e04d0f437ef1a230dc9d1c819d7c0" \
        "https://ftpmirror.gnu.org/gnu/gzip/gzip-${GZIP}.tar.xz" \
        "https://ftp.gnu.org/gnu/gzip/gzip-${GZIP}.tar.xz"
    fetch-source "ncurses-${NCURSES}" "30306e0c76e0f9f1f0de987cf1c82a5c21e1ce6568b9227f7da5b71cbea86c9d" \
        "https://ftpmirror.gnu.org/gnu/ncurses/ncurses-${NCURSES}.tar.gz" \
        "https://ftp.gnu.org/gnu/ncurses/ncurses-${NCURSES}.tar.gz"
    fetch-source "m4-${M4}" "f2c1e86ca0a404ff281631bdc8377638992744b175afb806e25871a24a934e07" \
        "https://ftpmirror.gnu.org/gnu/m4/m4-${M4}.tar.xz" \
        "https://ftp.gnu.org/gnu/m4/m4-${M4}.tar.xz"
    fetch-source "bison-${BISON}" "a3b5813f48a11e540ef26f46e4d288c0c25c7907d9879ae50e430ec49f63c010" \
        "https://ftpmirror.gnu.org/gnu/bison/bison-${BISON}.tar.xz" \
        "https://ftp.gnu.org/gnu/bison/bison-${BISON}.tar.xz"
    fetch-source "Python-${PYTHON}" "9c73e63c99855709b9be0b3cc9e5b072cb60f37311e8c4e50f15576a0bf82854" \
        "https://www.python.org/ftp/python/${PYTHON}/Python-${PYTHON}.tar.xz"
    fetch-source "libtool-${LIBTOOL}" "7c87a8c2c8c0fc9cd5019e402bed4292462d00a718a7cd5f11218153bf28b26f" \
        "https://ftpmirror.gnu.org/gnu/libtool/libtool-${LIBTOOL}.tar.xz" \
        "https://ftp.gnu.org/gnu/libtool/libtool-${LIBTOOL}.tar.xz"
}

build-kernel-headers() {
    progress-name "kernel-headers"
    build-command cd "/x10/build/$(x10-pkgid)"
                  unpack-source /x10/downloads/${SOURCES[$1]}
    build-command cd ${UNPACK_DIR:-$(basename $1)}
    
    shift

    progress-name "kernel-headers"
    build-command make headers
    build-command find usr/include -name "'.*'" -delete
    build-command install -dm755 $(x10-tree)/
    build-command cp -rv usr/include $(x10-tree)/
}

build-perl() {
    progress-name "perl"
    build-command cd "/x10/build/$(x10-pkgid)"
                  unpack-source /x10/downloads/${SOURCES[$1]}
    build-command cd ${UNPACK_DIR:-$(basename $1)}
    
    shift
    progress-name "perl"
    build-command sh Configure -des -Dprefix=$(x10-tree) -Dlibs='"-lm -lpthread"' \
        -Dvendorprefix=$(x10-tree) \
        -Duseshrplib \
        -Dusethreads
    build-command make -j '$(nproc)'
    build-command make install
}

build-stage1() {
    export PACKAGE=bootstrap-stage1
    setup

    setup-build-dirs
    build-autoconf "binutils-${BINUTILS}" --enable-shared --disable-werror --enable-deterministic-archives --enable-gold
    build-autoconf "gcc-${GCC}" --enable-languages=c,c++ --disable-multilib --with-system-zlib --enable-libstdcxx-dual-abi --enable-threads \
        --enable-initfini-array --enable-linker-build-id --enable-static-libgcc --without-zstd --disable-lto --disable-bootstrap \
        --with-native-system-header-dir=$(x10-tree bootstrap-stage1b)/include
    build-command ln -sfv gcc $(x10-tree)/bin/cc
    build-autoconf "coreutils-${COREUTILS}" --enable-install-program=hostname
    build-autoconf "tar-${TAR}"
    build-autoconf "xz-${XZ}" --disable-static
    build-perl "perl-${PERL}"
    build-autoconf "sed-${SED}"
    build-autoconf "grep-${GREP}"
    build-autoconf "gawk-${GAWK}"
    build-autoconf "make-${MAKE}"
    build-autoconf "diffutils-${DIFFUTILS}"
    build-autoconf "texinfo-${TEXINFO}" --disable-perl-xs --disable-texindex
    # build-autoconf "mpc-${MPC}" --disable-static
    # build-autoconf "mpfr-${MPFR}" --disable-static
    # build-autoconf "gmp-${GMP}" --disable-static
    build-autoconf "zlib-${ZLIB}" --enable-shared
    build-autoconf "ncurses-${NCURSES}" --with-manpage-format=normal --with-shared --without-debug --without-ada --without-normal \
        --enable-pc-files --enable-widec --with-pkg-config-libdir=$(x10-tree)/lib/pkgconfig
    MAKE_JOBS=-j1 build-autoconf "bash-${BASH}" --without-bash-malloc
    build-command ln -svf bash $(x10-tree)/bin/sh
    build-autoconf "findutils-${FINDUTILS}"
    build-autoconf "gzip-${GZIP}"
    PATCH_CMD='sed -i "s/IO_ftrylockfile/IO_EOF_SEEN/" lib/*.c; echo "#define _IO_IN_BACKUP 0x100" >> lib/stdio-impl.h' build-autoconf "m4-${M4}"
    build-autoconf "bison-${BISON}"
    build-autoconf "Python-${PYTHON}" --disable-ipv6 --without-ensurepip --enable-shared ac_cv_file__dev_ptmx=yes ac_cv_file__dev_ptc=no
    build-autoconf "libtool-${LIBTOOL}" --disable-static
}

build() {
    INHERIT_ENVIRONMENT=1
    # stage 1: build host tools - no regard for known inputs at this part

    # glibc gets its own subdirectory because of reasons (screws with xz)
    export PACKAGE=bootstrap-stage1b
    setup
    setup-build-dirs
    build-kernel-headers "linux-${KERNEL}"
    build-autoconf "glibc-${GLIBC}" --enable-kernel=5.0 --with-headers=$(x10-tree)/include --disable-werror \
        --enable-shared libc_cv_slibdir=$(x10-tree)/lib --without-selinux
    build-command mkdir -pv $(x10-tree)/lib64/
    build-command ln -sfv $(x10-tree)/lib/ld-linux-x86-64.so.2 $(x10-tree)/lib64/

    build-stage1

    # stage 2: build the actual bootstrap environment. this should be reproducible.
    export PACKAGE=bootstrap
    INHERIT_ENVIRONMENT=

    setup
    x10-import $(x10-pkgid bootstrap-stage1)
    x10-import $(x10-pkgid bootstrap-stage1b)
    setup-build-dirs

    build-kernel-headers "linux-${KERNEL}"
    DESTDIR=$(x10-tree) build-autoconf "glibc-${GLIBC}" --enable-kernel=5.0 --with-headers=$(x10-tree)/include --disable-werror \
        --enable-shared --libdir=/lib libc_cv_slibdir=/lib --without-selinux --prefix=/
    build-autoconf "binutils-${BINUTILS}" --enable-shared --disable-werror --enable-deterministic-archives --enable-gold \
        --with-system-zlib --with-sysroot=$(x10-tree)
    build-autoconf "mpc-${MPC}" --disable-static
    build-autoconf "mpfr-${MPFR}" --disable-static
    build-autoconf "gmp-${GMP}" --disable-static
    build-autoconf "gcc-${GCC}" --enable-languages=c,c++ --disable-multilib --with-system-zlib --enable-libstdcxx-dual-abi \
        --enable-threads --enable-initfini-array --enable-linker-build-id --without-zstd --disable-libgomp \
        --with-sysroot=$(x10-tree) --with-native-system-header-dir=/include --disable-werror
    build-autoconf "coreutils-${COREUTILS}" --enable-install-program=hostname --disable-xattr --disable-libcap
    build-autoconf "tar-${TAR}" --disable-acl --without-posix-acls
    build-autoconf "xz-${XZ}" --disable-static
    build-perl "perl-${PERL}"
    build-autoconf "sed-${SED}"
    build-autoconf "grep-${GREP}"
    build-autoconf "gawk-${GAWK}"
    build-autoconf "make-${MAKE}"
    build-autoconf "diffutils-${DIFFUTILS}"
    build-autoconf "texinfo-${TEXINFO}" --disable-perl-xs --disable-texindex
    build-autoconf "zlib-${ZLIB}" --enable-shared
    build-autoconf "ncurses-${NCURSES}" --with-manpage-format=normal --with-shared --without-debug --without-ada --without-normal \
        --enable-pc-files --enable-widec --with-pkg-config-libdir=$(x10-tree)/lib/pkgconfig
    MAKE_JOBS=-j1 build-autoconf "bash-${BASH}" --without-bash-malloc
    build-command ln -svf bash $(x10-tree)/bin/sh
    build-autoconf "findutils-${FINDUTILS}"
    build-autoconf "gzip-${GZIP}"
    build-autoconf "m4-${M4}"
    build-autoconf "bison-${BISON}"
    build-autoconf "Python-${PYTHON}" --disable-ipv6 --without-ensurepip --enable-shared ac_cv_file__dev_ptmx=yes ac_cv_file__dev_ptc=no
    build-autoconf "libtool-${LIBTOOL}" --disable-static

    PACKAGE=bootstrap-stage1b do-package
    PACKAGE=bootstrap-stage1  do-package
    do-package
}

fetch
build
