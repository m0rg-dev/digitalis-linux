. env.sh

tar xfJ findutils-*.tar.xz
rm findutils-*.tar.xz
cd findutils-*

# it's prefixed with a _ for a reason you numbskulls
sed -i 's/_POSIX_ARG_MAX/4096/' lib/buildcmd.c

mkdir -p build
cd build

../configure --host=$TARGET --prefix=/usr CFLAGS=-I/new_root/usr/include
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
