. env.sh
cd gcc-*

mkdir -p build-target 'build-libstdc++'
cd 'build-libstdc++'
'../libstdc++-v3/configure' --host=x86_64-unknown-linux-gnu --prefix=/usr --disable-multilib --disable-nls \
    --disable-libstdcxx-threads --disable-libstdcxx-pch
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install

# this misbehaves for some reason. but we know we're using glibc > 2.15 so we can fix things up
sed -i 's/__GLIBC_PREREQ(2,15)/1/' /new_root/usr/include/c++/9.3.0/x86_64-unknown-linux-gnu/bits/os_defines.h

cd ..
cd build-target

../configure --host=$TARGET --target=$TARGET --prefix=/usr --enable-languages=c --disable-libstdcxx-pch --disable-multilib \
    --disable-bootstrap --disable-libgomp \
    CXXFLAGS='-I/new_root/usr/include/c++/9.3.0 -I/new_root/usr/include/c++/9.3.0/x86_64-unknown-linux-gnu'

make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install

