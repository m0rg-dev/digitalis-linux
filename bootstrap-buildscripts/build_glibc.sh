. env.sh

tar xfJ glibc-*.tar.xz
rm glibc-*.tar.xz
cd glibc-*
mkdir -p build
cd build

../configure --host=$TARGET --target=$TARGET --prefix= --disable-gcc-wrapper --disable-werror --with-sysroot=/new_root
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install

cp -rv /new_root/include/* /new_root/usr/include/
