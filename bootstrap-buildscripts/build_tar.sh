. env.sh

tar xfJ tar-*.tar.xz
rm tar-*.tar.xz
cd tar-*
mkdir -p build
cd build

FORCE_UNSAFE_CONFIGURE=1 ../configure --host=$TARGET --prefix=/usr CFLAGS=-I/new_root/usr/include
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
