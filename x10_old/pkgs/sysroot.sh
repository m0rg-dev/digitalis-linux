source ../lib.sh

export PACKAGE=sysroot
export VERSION=1

x10-generate() {
    x10-import-always ./bash.sh
    x10-import-always ./coreutils.sh
    x10-import-always ./diffutils.sh
    x10-import-always ./file.sh
    x10-import-always ./findutils.sh
    x10-import-always ./gawk.sh
    x10-import-always ./grep.sh
    x10-import-always ./python.sh
    x10-import-always ./sed.sh
    x10-import-always ./which.sh
}
