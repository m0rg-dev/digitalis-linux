. env.sh

tar xfJ coreutils-*.tar.xz
rm coreutils-*.tar.xz
cd coreutils-*
mkdir -p build
cd build

FORCE_UNSAFE_CONFIGURE=1 ../configure --host=$TARGET --prefix= CFLAGS=-I/new_root/usr/include
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
