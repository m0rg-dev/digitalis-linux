download() {
    local url=$1
    local file=$(basename $1)
    if [ -n "$2" ]; then
        file="$2"
    fi

    if [ -e distfiles/$file ]; then
        echo "$file: already downloaded"
    else
        wget $url -O distfiles/$file
    fi
}

download https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-5.7.5.tar.xz
download https://www.kernel.org/pub/linux/docs/man-pages/man-pages-5.05.tar.xz
download http://ftp.gnu.org/gnu/glibc/glibc-2.31.tar.xz
download https://zlib.net/zlib-1.2.11.tar.xz
download https://www.sourceware.org/pub/bzip2/bzip2-1.0.8.tar.gz
download http://ftp.gnu.org/gnu/diffutils/diffutils-3.7.tar.xz
download https://tukaani.org/xz/xz-5.2.5.tar.xz
download ftp://ftp.astron.com/pub/file/file-5.39.tar.gz
download http://ftp.gnu.org/gnu/ncurses/ncurses-6.2.tar.gz
download http://ftp.gnu.org/gnu/gmp/gmp-6.2.0.tar.xz
download https://www.cpan.org/src/5.0/perl-5.32.0.tar.xz
download http://www.mpfr.org/mpfr-4.0.2/mpfr-4.0.2.tar.xz
download https://ftp.gnu.org/gnu/mpc/mpc-1.1.0.tar.gz
download http://ftp.gnu.org/gnu/gcc/gcc-9.3.0/gcc-9.3.0.tar.xz
download http://ftp.gnu.org/gnu/coreutils/coreutils-8.32.tar.xz
download http://ftp.gnu.org/gnu/tar/tar-1.32.tar.xz
download https://github.com/shadow-maint/shadow/releases/download/4.8.1/shadow-4.8.1.tar.xz
download http://ftp.gnu.org/gnu/grep/grep-3.4.tar.xz
download http://ftp.gnu.org/gnu/sed/sed-4.8.tar.xz
download http://ftp.gnu.org/gnu/gawk/gawk-5.1.0.tar.xz
download https://sourceforge.net/projects/procps-ng/files/Production/procps-ng-3.3.15.tar.xz
download https://www.kernel.org/pub/linux/utils/util-linux/v2.35/util-linux-2.35.1.tar.xz
download https://ftp.gnu.org/gnu/which/which-2.21.tar.gz
download http://sethwklein.net/iana-etc-2.30.tar.bz2
download http://www.iana.org/time-zones/repository/releases/tzdata2020a.tar.gz
download https://github.com/OpenRC/openrc/archive/0.42.1.tar.gz openrc-0.42.1.tar.gz
download http://ftp.gnu.org/gnu/bash/bash-5.0.tar.gz
download https://github.com/zsh-users/zsh/archive/zsh-5.8.tar.gz
download http://ftp.gnu.org/gnu/autoconf/autoconf-2.69.tar.xz
download http://www.ivarch.com/programs/sources/pv-1.6.6.tar.gz
download http://ftp.gnu.org/gnu/automake/automake-1.16.1.tar.xz
download https://github.com/gavinhoward/bc/archive/2.5.3/bc-2.5.3.tar.gz
download http://ftp.gnu.org/gnu/bison/bison-3.6.tar.xz
download http://ftp.gnu.org/gnu/nano/nano-4.9.tar.xz
download http://ftp.gnu.org/gnu/m4/m4-1.4.18.tar.xz
download http://ftp.gnu.org/gnu/gettext/gettext-0.20.tar.xz
download http://ftp.gnu.org/gnu/groff/groff-1.22.4.tar.gz
download https://github.com/westes/flex/releases/download/v2.6.4/flex-2.6.4.tar.gz
download http://ftp.gnu.org/gnu/libtool/libtool-2.4.tar.xz
download http://ftp.gnu.org/gnu/make/make-4.3.tar.gz
download http://ftp.gnu.org/gnu/patch/patch-2.7.6.tar.xz
download https://pkg-config.freedesktop.org/releases/pkg-config-0.29.2.tar.gz
download https://www.python.org/ftp/python/3.8.3/Python-3.8.3.tar.xz
download http://ftp.gnu.org/gnu/gzip/gzip-1.10.tar.xz
download https://dev.gentoo.org/~blueness/eudev/eudev-3.2.9.tar.gz
download http://ftp.gnu.org/gnu/grub/grub-2.04.tar.xz
download http://ftp.gnu.org/gnu/gperf/gperf-3.1.tar.gz
download https://sourceware.org/ftp/elfutils/0.180/elfutils-0.180.tar.bz2
download https://www.openssl.org/source/openssl-1.1.1d.tar.gz
download https://www.kernel.org/pub/linux/utils/kernel/kmod/kmod-26.tar.xz
download http://ftp.gnu.org/gnu/inetutils/inetutils-1.9.4.tar.xz
download https://cdn.openbsd.org/pub/OpenBSD/OpenSSH/portable/openssh-8.3p1.tar.gz
download http://ftp.gnu.org/gnu/cpio/cpio-2.13.tar.gz
download https://www.kernel.org/pub/linux/utils/net/iproute2/iproute2-5.5.0.tar.xz
download https://mirrors.edge.kernel.org/pub/linux/network/wireless/iwd-1.8.tar.xz
download https://roy.marples.name/downloads/dhcpcd/dhcpcd-9.1.2.tar.xz
download http://ftp.gnu.org/gnu/readline/readline-8.0.tar.gz
download https://dbus.freedesktop.org/releases/dbus/dbus-1.12.18.tar.gz
download https://prdownloads.sourceforge.net/expat/expat-2.2.9.tar.xz
download https://downloads.sourceforge.net/project/e2fsprogs/e2fsprogs/v1.45.5/e2fsprogs-1.45.5.tar.gz
download http://ftp.gnu.org/gnu/gdb/gdb-9.2.tar.xz
download https://mirrors.edge.kernel.org/pub/linux/utils/boot/dracut/dracut-050.tar.xz
download http://download.savannah.gnu.org/releases/attr/attr-2.4.48.tar.gz
download http://anduin.linuxfromscratch.org/LFS/udev-lfs-20171102.tar.xz
download https://mirrors.edge.kernel.org/pub/linux/kernel/firmware/linux-firmware-20200619.tar.xz
download https://nodejs.org/download/release/v14.4.0/node-v14.4.0.tar.xz

#download https://raw.githubusercontent.com/robbat2/genkernel/v3.5.3.3/defaults/kernel-generic-config linux-config
cp linux-config distfiles/
