set -e
set -x

ulimit -n 65536

VOLUMES='--volume /tmp/repo_digi2:/repo'

ctr=$(buildah from digitalis)
buildah run --net host $VOLUMES "$ctr" -- mkdir /new_root
buildah run --net host $VOLUMES "$ctr" -- dnf install -y \
    --verbose --repo=digitalis --installroot=/new_root --releasever=digi2 \
    fs-tree
buildah run --net host $VOLUMES "$ctr" -- dnf install -y \
    --verbose --repo=digitalis --installroot=/new_root --releasever=digi2 \
    digitalis-bootstrap-repository base-system
buildah run --net host $VOLUMES --volume /proc:/new_root/proc --volume /dev:/new_root/dev "$ctr" -- dnf install -y \
    --verbose --repo=digitalis --installroot=/new_root --releasever=digi2 \
    bare-metal
buildah run --net host $VOLUMES --volume /proc:/new_root/proc --volume /dev:/new_root/dev "$ctr" -- dnf install -y \
    --verbose --repo=digitalis --releasever=digi2 \
    grub

buildah run --net host "$ctr" -- tar cp -C /new_root . > digitalis_rootfs.tar

find new_root -type d | xargs -r chmod u+w
rm -rf new_root
mkdir new_root
cd new_root
tar xf ../digitalis_rootfs.tar
cd ..

virt-make-fs --partition=mbr -t ext4 -s +10G -- digitalis_rootfs.tar digitalis_rootfs.img

# virt-make-fs doesn't do a good job of qcow2 sparse images
qemu-img convert -O qcow2 digitalis_rootfs.img digitalis_rootfs.new.img
mv digitalis_rootfs.new.img digitalis_rootfs.img

guestfish -x <<EOF
add digitalis_rootfs.img
run
mount /dev/sda1 /
sh "grub-install /dev/sda"
sh "grub-mkconfig -o /boot/grub/grub.cfg"
sh "useradd -m -U digitalis -G wheel -p foo"
sh "echo -e 'digitalis\ndigitalis' | passwd digitalis"
sh "echo /dev/vda1 / ext4 noatime 0 1 >/etc/fstab"
mkdir /sys
EOF
