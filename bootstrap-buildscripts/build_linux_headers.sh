. env.sh

tar xfJ linux-5.7.5.tar.xz
rm linux-5.7.5.tar.xz
cd linux-5.7.5
make defconfig
make headers
cp -rv usr /new_root/

