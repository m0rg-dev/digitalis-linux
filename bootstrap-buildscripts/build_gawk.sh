. env.sh

tar xfJ gawk-*.tar.xz
rm gawk-*.tar.xz
cd gawk-*
mkdir -p build
cd build

../configure --host=$TARGET --prefix=/usr CFLAGS=-I/new_root/usr/include
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install