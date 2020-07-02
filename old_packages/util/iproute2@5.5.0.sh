export VERSION=5.5.0

PACKAGE=iproute2
UPSTREAM=https://www.kernel.org/pub/linux/utils/net/
PRECONFSCRIPT="sed -i /ARPD/d Makefile
rm -fv man/man8/arpd.8
sed -i 's/.m_ipt.o//' tc/Makefile"

use_mod acmake
