. env.sh

tar xfJ binutils-*.tar.xz
rm binutils-*.tar.xz
cd binutils-*
mkdir -p build
cd build

../configure --target=$TARGET --with-lib-path=/new_root/lib --with-sysroot=/new_root/ --disable-nls --disable-werror
make $GLOBAL_MAKE_OPTS
make install
ln -s lib /new_root/lib64
