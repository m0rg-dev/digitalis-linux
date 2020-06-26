. env.sh

tar xfJ m4-*.tar.xz
rm m4-*.tar.xz
cd m4-*

sed -i 's/IO_ftrylockfile/IO_EOF_SEEN/' lib/*.c
echo "#define _IO_IN_BACKUP 0x100" >> lib/stdio-impl.h

mkdir -p build
cd build

../configure --host=$TARGET --prefix=/usr CFLAGS='-I/new_root/usr/include -DSLOW_BUT_NO_HACKS'
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
