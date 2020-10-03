set -e
set -x

ulimit -n 65536

node x10/x10_repo.js repository
node x10/x10.js --repository=./repository build virtual/base-system kernel/linux core/linux-firmware
buildah unshare sh -exc '
    ctr=$(buildah from scratch)
    dir=$(buildah mount "$ctr")

    mkdir -p $dir/var/lib/x10/database

    node x10/x10_repo.js repository
    node x10/x10.js --repository=$(realpath ./repository) --target_root="$dir" --without_default_depends --without_hostdb install core/fs-tree
    node x10/x10.js --repository=$(realpath ./repository) --target_root="$dir" --without_default_depends --without_hostdb install libs/glibc core/bash util/coreutils
    node x10/x10.js --repository=$(realpath ./repository) --target_root="$dir" --without_default_depends --without_hostdb install virtual/base-system core/linux-firmware

    mkdir -p $dir/usr/share/x10
    cp -r x10/* $dir/usr/share/x10
    cp -r repository $dir/var/lib/x10/repo

    buildah run --net host "$ctr" node /usr/share/x10/x10.js install kernel/linux core/eudev

    ls $dir
    rm -r $dir/var/lib/x10/repo
    virt-make-fs --partition=mbr -t ext4 -s +10G --format=qcow2 -- $dir digitalis_rootfs.img
    cp -r $dir/boot .
    buildah umount $ctr

    buildah rm $ctr
'

cat > /tmp/99-auto-grub.start <<EOF
set -x
mkinitcpio -P
grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg
shutdown -p now
EOF

guestfish <<EOF
add digitalis_rootfs.img
run
mount /dev/sda1 /
copy-in /tmp/99-auto-grub.start /etc/local.d/
chmod 0777 /etc/local.d/99-auto-grub.start
mv /etc/runlevels/default/agetty.tty1 /
write /etc/conf.d/local "rc_verbose=yes"
EOF

rm /tmp/99-auto-grub.start

qemu-system-x86_64 -kernel boot/vmlinuz-* -initrd boot/initramfs-*-huge.img -hda digitalis_rootfs.img -curses -append "root=/dev/sda1" -m 4G -accel kvm

guestfish <<EOF
add digitalis_rootfs.img
run
mount /dev/sda1 /
rm /etc/local.d/99-auto-grub.start
rm /etc/conf.d/local
mv /agetty.tty1 /etc/runlevels/default/
EOF

rm -r boot