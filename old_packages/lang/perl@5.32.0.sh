VERSION=5.32.0

export SRC="perl-$VERSION.tar.gz"
export SRC_URL="https://www.cpan.org/src/5.0/$SRC"

pkg_build() {
    echo "127.0.0.1 localhost $(hostname)" > /etc/hosts

    tar xfz $SRC
    rm $SRC

    cd perl-$VERSION

    sh Configure -des -Dprefix=/usr             \
                  -Dvendorprefix=/usr           \
                  -Dman1dir=/usr/share/man/man1 \
                  -Dman3dir=/usr/share/man/man3 \
                  -Dpager="/usr/bin/less -isR"  \
                  -Duseshrplib                  \
                  -Dusethreads                  \
                  -Dcc=gcc                      \
                  -Dccflags=-DMB_LEN_MAX=16

    make $MAKEOPTS
    make DESTDIR=.. install
    cd ..
    rm -r perl-$VERSION
}