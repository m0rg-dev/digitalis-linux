VERSION=2.35.1

export SRC=util-linux-$VERSION.tar.xz
export SRC_URL=https://www.kernel.org/pub/linux/utils/util-linux/v2.35/$SRC

pkg_build() {
    tar xfJ $SRC
    rm $SRC

    mkdir -p var/lib/hwclock

    cd util-linux-$VERSION
    ./configure ADJTIME_PATH=/var/lib/hwclock/adjtime   \
            --disable-chfn-chsh  \
            --disable-login      \
            --disable-nologin    \
            --disable-su         \
            --disable-setpriv    \
            --disable-runuser    \
            --disable-pylibmount \
            --disable-static     \
            --without-python     \
            --without-systemd    \
            --without-systemdsystemunitdir

    make $MAKEOPTS
    make DESTDIR=$(realpath ..) install

    cd ..
    rm -r util-linux-$VERSION
}