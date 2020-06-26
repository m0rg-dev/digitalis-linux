. env.sh

tar xfz make-*.tar.gz
rm make-*.tar.gz
cd make-*
mkdir -p  build
cd build

../configure --prefix=/usr --host=$TARGET --without-guile
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
