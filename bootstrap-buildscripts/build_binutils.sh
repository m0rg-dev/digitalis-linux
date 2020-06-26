. env.sh

cd binutils-*
mkdir -p build-target
cd build-target

../configure --prefix=/usr --disable-werror --disable-nls --host=$TARGET --target=$TARGET --with-sysroot=/new_root --with-lib-path=/lib

make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install