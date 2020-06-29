export VERSION=1.4.18

PACKAGE=m4
UPSTREAM=http://ftp.gnu.org/gnu/
PRECONFSCRIPT="sed -i 's/IO_ftrylockfile/IO_EOF_SEEN/' lib/*.c
echo '#define _IO_IN_BACKUP 0x100' >> lib/stdio-impl.h"

use_mod acmake

