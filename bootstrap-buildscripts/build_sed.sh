. env.sh

tar xfJ sed-*.tar.xz
rm sed-*.tar.xz
cd sed-*
mkdir -p build
cd build

../configure --host=$TARGET --prefix=/usr CFLAGS=-I/new_root/usr/include
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
