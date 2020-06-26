. env.sh

tar xfJ Python-*.tar.xz
rm Python-*.tar.xz
cd Python-*

echo ac_cv_file__dev_ptmx=yes > config.site
echo ac_cv_file__dev_ptc=no >> config.site

CONFIG_SITE=config.site ./configure --build=x86_64-pc-linux-musl --host=$TARGET --without-ensurepip --prefix=/usr --disable-ipv6
sed -i 's/-Werror=implicit-function-declaration//' Makefile
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
