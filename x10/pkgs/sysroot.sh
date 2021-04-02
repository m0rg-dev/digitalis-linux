source ../lib.sh

export PACKAGE=sysroot
export VERSION=1

x10-generate() {
    x10-import-always .//bash.sh
    x10-import-always .//coreutils.sh
}
