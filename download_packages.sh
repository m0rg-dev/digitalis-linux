download() {
    local url=$1
    local file=$(basename $1)
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
