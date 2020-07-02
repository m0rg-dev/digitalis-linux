export VERSION=3.2.9

export BDEPEND="util/gperf util/kmod core/lfs-udev-rules"

export SRC=eudev-$VERSION.tar.gz
export SRC_URL=https://dev.gentoo.org/~blueness/eudev/$SRC

pkg_build() {
    tar xfz $SRC
    rm $SRC

    mkdir -pv {lib,etc}/udev/rules.d

    cd eudev-$VERSION
    ./configure --prefix=/usr       \
            --bindir=/sbin          \
            --sbindir=/sbin         \
            --libdir=/usr/lib       \
            --sysconfdir=/etc       \
            --libexecdir=/lib       \
            --with-rootprefix=      \
            --with-rootlibdir=/lib  \
            --enable-manpages       \
            --disable-static

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r eudev-$VERSION

    sbin/udevadm hwdb -r . --update
}