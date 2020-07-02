. env.sh

tar xfJ node-v14.4.0.tar.xz
rm node-v14.4.0.tar.xz
cd node-v14.4.0

./configure --enable-static --fully-static
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install

