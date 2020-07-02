export VERSION=5.39

COMP=tar.gz
PACKAGE=file
UPSTREAM=ftp://ftp.astron.com/pub/
MAKEINSTALLOPTS="PREFIX=$(realpath .)/usr"

use_mod acmake
