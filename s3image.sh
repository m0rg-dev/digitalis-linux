set -e
set -x

DEV=$1

umount -rf s3root/proc || true
umount -rf s3root/dev || true
umount -rf s3root/sys || true
umount -rf s3root || true

mkfs.ext4 /dev/${DEV}1
rm -rf s3root
mkdir -p s3root
mount /dev/${DEV}1 s3root

cd s3root
tar xpf ../stage3.tar
chmod 755 .

mount --bind /dev dev
mount --bind /sys sys
mount -t proc proc proc
chroot . grub-install /dev/$DEV

mkdir -p usr/share/rpkg var/lib/rpkg/
cp -r ../packages var/lib/rpkg/
cp -r ../stage3 var/lib/rpkg/built
cp -r ../rpkg/* usr/share/rpkg/

chroot . node usr/share/rpkg/rpkg.js postinstall kernel/linux
chroot . grub-mkconfig -o /boot/grub/grub.cfg

cd ..
umount s3root/dev
umount s3root/sys
umount -r s3root
