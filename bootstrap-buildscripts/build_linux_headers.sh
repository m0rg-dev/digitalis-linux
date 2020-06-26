. env.sh

tar xfJ linux-*.tar.xz
rm linux-*.tar.xz
cd linux-*
make defconfig
make headers
cp -rv usr /new_root/

