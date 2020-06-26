. env.sh

tar xfJ bison-*.tar.xz
rm bison-*.tar.xz
cd bison-*
mkdir -p build
cd build

../configure --host=$TARGET --prefix=/usr CFLAGS=-I/new_root/usr/include
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install