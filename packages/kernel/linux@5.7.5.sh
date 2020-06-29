export VERSION=5.7.5

export BDEPEND="libs/libelf libs/openssl util/kmod util/cpio"
export RDEPEND="util/kmod"

export SRC="linux-$VERSION.tar.xz linux-config"
export SRC_URL="https://cdn.kernel.org/pub/linux/kernel/v5.x/$SRC"

pkg_build() {
    set -x
    
    tar xfJ linux-$VERSION.tar.xz
    rm linux-$VERSION.tar.xz
    cd linux-$VERSION

    make mrproper
    cp ../linux-config .
    make olddefconfig
    make $MAKEOPTS
    make INSTALL_MOD_PATH=$(realpath ..) modules_install
    mkdir -p ../boot
    cp -iv arch/$(uname -m)/boot/bzImage ../boot/vmlinuz-$VERSION
    cp -iv .config ../boot/config-$VERSION
    install -d ../usr/share/doc/linux-$VERSION
    cp -r Documentation/* ../usr/share/doc/linux-$VERSION

    cd ..
    rm -r linux-$VERSION linux-config
    install -v -m755 -d etc/modprobe.d
    cat > etc/modprobe.d/usb.conf << "EOF"
# Begin /etc/modprobe.d/usb.conf

install ohci_hcd /sbin/modprobe ehci_hcd ; /sbin/modprobe -i ohci_hcd ; true
install uhci_hcd /sbin/modprobe ehci_hcd ; /sbin/modprobe -i uhci_hcd ; true

# End /etc/modprobe.d/usb.conf
EOF

    set +x
}