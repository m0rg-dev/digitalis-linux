export SRC="linux-5.7.5.tar.xz"

pkg_build() {
    tar xfJ linux-*.tar.xz
    rm linux-*.tar.xz
    cd linux-*

    make mrproper
    make headers
    find usr/include -name '.*' -delete
    rm usr/include/Makefile
    cd ..
    mkdir -p usr/include/
    cp -rv linux-*/usr/include/* usr/include
    rm -r linux-*
}