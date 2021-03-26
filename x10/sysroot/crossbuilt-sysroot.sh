source ../lib.sh

export PACKAGE=crossbuilt-sysroot
export VERSION=1

# This contains tools built using xbinutils and xgcc. It's probably sufficient to
# use these to build the whole system, but we'll go around one more time to make sure
# compilers and such correctly think they were built native.

x10-generate() {
    x10-import ./host-bash.sh
    x10-import ./host-binutils.sh
    x10-import ./host-coreutils.sh
    x10-import ./host-diffutils.sh
    x10-import ./host-findutils.sh
    x10-import ./host-gawk.sh
    x10-import ./host-gcc.sh
    x10-import ./host-glibc.sh
    x10-import ./host-grep.sh
    x10-import ./host-gzip.sh
    x10-import ./host-kernel-headers.sh
    x10-import ./host-libstdc++.sh
    x10-import ./host-m4.sh
    x10-import ./host-make.sh
    x10-import ./host-ncurses.sh
    x10-import ./host-sed.sh
    x10-import ./host-tar.sh
    x10-import ./host-xz.sh
}
