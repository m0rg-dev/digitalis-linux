. env.sh

tar xfz perl-*.tar.gz
rm perl-*.tar.gz
cd perl-*

sh Configure -des -Dprefix=/usr -Dlibs=-lm -Uloclibpth -Ulocincpth
make $GLOBAL_MAKE_OPTS
make DESTDIR=/new_root install
