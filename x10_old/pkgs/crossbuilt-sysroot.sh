source ../lib.sh

export PACKAGE=crossbuilt-sysroot
export VERSION=1

# This contains tools built using xbinutils and xgcc. It's probably sufficient to
# use these to build the whole system, but we'll go around one more time to make sure
# compilers and such correctly think they were built native.

x10-generate() {
    x10-import-always ./host-bash.sh
    x10-import-always ./host-binutils.sh
    x10-import-always ./host-bison.sh
    x10-import-always ./host-coreutils.sh
    x10-import-always ./host-diffutils.sh
    x10-import-always ./host-findutils.sh
    x10-import-always ./host-gawk.sh
    x10-import-always ./host-gcc.sh
    x10-import-always ./host-glibc.sh
    x10-import-always ./host-grep.sh
    x10-import-always ./host-gzip.sh
    x10-import-always ./host-kernel-headers.sh
    x10-import-always ./host-libstdc++.sh
    x10-import-always ./host-m4.sh
    x10-import-always ./host-make.sh
    x10-import-always ./host-ncurses.sh
    x10-import-always ./host-patchelf.sh
    x10-import-always ./host-python.sh
    x10-import-always ./host-sed.sh
    x10-import-always ./host-tar.sh
    x10-import-always ./host-xz.sh
}
