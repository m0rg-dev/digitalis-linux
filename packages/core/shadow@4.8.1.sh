VERSION=4.8.1

export SRC=shadow-$VERSION.tar.xz
export SRC_URL=https://github.com/shadow-maint/shadow/releases/download/$VERSION/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    cd shadow-$VERSION
    sed -i 's/groups$(EXEEXT) //' src/Makefile.in
    find man -name Makefile.in -exec sed -i 's/groups\.1 / /'   {} \;
    find man -name Makefile.in -exec sed -i 's/getspnam\.3 / /' {} \;
    find man -name Makefile.in -exec sed -i 's/passwd\.5 / /'   {} \;

    sed -i -e 's@#ENCRYPT_METHOD DES@ENCRYPT_METHOD SHA512@' \
       -e 's@/var/spool/mail@/var/mail@' etc/login.defs
    sed -i 's/1000/999/' etc/useradd

    ./configure --sysconfdir=/etc --with-group-name-max-length=32
    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r shadow-$VERSION
}

pkg_postinstall() {
    pwconv
    grpconv
}