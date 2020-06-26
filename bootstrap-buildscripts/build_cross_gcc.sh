. env.sh

tar xfJ gcc-*.tar.xz
rm gcc-*.tar.xz
cd gcc-*

./contrib/download_prerequisites

mkdir -p build
cd build

../configure                                       \
    --target=$TARGET                               \
    --with-glibc-version=2.11                      \
    --with-sysroot=/new_root                       \
    --with-newlib                                  \
    --without-headers                              \
    --disable-nls                                  \
    --disable-shared                               \
    --disable-multilib                             \
    --disable-decimal-float                        \
    --disable-threads                              \
    --disable-libatomic                            \
    --disable-libgomp                              \
    --disable-libquadmath                          \
    --disable-libssp                               \
    --disable-libvtv                               \
    --disable-libstdcxx                            \
    --enable-languages=c,c++
make $GLOBAL_MAKE_OPTS
make install
