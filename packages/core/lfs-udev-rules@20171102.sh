export VERSION=20171102

export SRC=udev-lfs-$VERSION.tar.xz
export SRC_URL=http://anduin.linuxfromscratch.org/LFS/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    make DESTDIR=$(realpath .) -f udev-lfs-$VERSION/Makefile.lfs install
    
    rm -r udev-lfs-$VERSION
}