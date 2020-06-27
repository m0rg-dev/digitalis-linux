export VERSION=0.42.1

export SRC=openrc-$VERSION.tar.gz
export SRC_URL=https://github.com/OpenRC/openrc/archive/$VERSION.tar.gz

pkg_build() {
    tar xfz $SRC
    rm $SRC

    cd openrc-$VERSION
    MAKE_ARGS="LIBNAME=/lib
            MKBASHCOMP=yes
            MKZSHCOMP=yes
            SH=bash
            OS=Linux
            MKSYSVINIT=yes"
    export BRANDING="Digitalis Linux"

    make $MAKEOPTS $MAKE_ARGS
    make $MAKE_ARGS DESTDIR=$(realpath ..) install

    cd ..
    rm -r openrc-$VERSION
}