export VERSION=8.3p1

export BDEPEND="libs/openssl"
export RDEPEND="libs/openssl"

PACKAGE=openssh
COMP=tar.gz

use_mod acmake

export SRC_URL=https://cdn.openbsd.org/pub/OpenBSD/OpenSSH/portable/$SRC