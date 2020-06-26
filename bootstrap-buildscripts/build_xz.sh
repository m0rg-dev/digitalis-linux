. env.sh

tar xfJ xz-*.tar.xz
rm xz-*.tar.xz
cd xz-*
mkdir -p build
cd build

../configure --host=$TARGET --prefix=/usr --libdir=/lib CFLAGS=-I/new_root/usr/include
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
