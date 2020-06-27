VERSION=5.8

export SRC=zsh-$VERSION.tar.gz
export SRC_URL=https://github.com/zsh-users/zsh/archive/$VERSION

pkg_build() {
    tar xfz $SRC
    rm $SRC

    cd zsh-zsh-$VERSION
    ./Util/preconfig
    ./configure --prefix=/usr --bindir=/bin
    make $MAKEOPTS
    # TODO man + nroff in BDEPS then we can install manpages
    make DESTDIR=$(realpath ..) install.bin install.modules

    cd ..
    rm -r zsh-zsh-$VERSION
}