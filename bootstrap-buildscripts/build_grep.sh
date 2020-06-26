. env.sh

tar xfJ grep-*.tar.xz
rm grep-*.tar.xz
cd grep-*
mkdir -p build
cd build

../configure --host=$TARGET --prefix=/usr CFLAGS=-I/new_root/usr/include
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install