. env.sh

tar xfz pv-*.tar.gz
rm pv-*.tar.gz
cd pv-*

./configure --host=$TARGET --prefix=/usr
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
