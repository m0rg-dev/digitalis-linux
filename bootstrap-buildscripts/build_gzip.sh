. env.sh

tar xfJ gzip-*.tar.xz
rm gzip-*.tar.xz
cd gzip-*
mkdir -p build
cd build

../configure --host=$TARGET --prefix=/usr CFLAGS=-I/new_root/usr/include
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
