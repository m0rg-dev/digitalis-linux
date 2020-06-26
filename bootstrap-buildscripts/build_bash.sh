. env.sh

tar xfz bash-*.tar.gz
rm bash-*.tar.gz
cd bash-*
mkdir -p build
cd build

../configure --host=$TARGET --without-bash-malloc --prefix=
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
ln -s bash /new_root/bin/sh
