#!/usr/bin/env bash

set -e
#set -x

ulimit -n 65536

sh download_packages.sh

ctr=$(buildah from digitalis-stage2)

buildah run "$ctr" --  mkdir -p /var/lib/rpkg/{built,installed,distfiles,packages} /tmp
buildah run "$ctr" --  mkdir -p /usr/share/rpkg
buildah add "$ctr" packages/ /var/lib/rpkg/packages
buildah add "$ctr" distfiles/ /var/lib/rpkg/distfiles
buildah run "$ctr" -- sh -c "rm -rf /var/lib/rpkg/built/*"
if [ -e stage3 ]; then
    buildah add "$ctr" stage3/ /var/lib/rpkg/built
fi
buildah add "$ctr" rpkg/ /usr/share/rpkg

buildah run "$ctr" -- mkdir -p /new_root
buildah run "$ctr" -- node /usr/share/rpkg/rpkg.js \
    --skip_confirm --without_default_depends --target_root=/new_root \
    install base-system kernel/linux


ctr2=$(buildah from scratch)
buildah run "$ctr" -- sh -c 'cd /new_root; tar cp .' > stage3.tar
buildah add "$ctr2" stage3.tar

buildah run "$ctr" -- node /usr/share/rpkg/rpkg.js \
    --skip_confirm --without_default_depends --target_root=/new_root \
    install build-tools linux-firmware

mkdir -p stage3/
buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/lib/rpkg/built/* 'stage3/ || true
buildah umount "$ctr"

buildah rm "$ctr"

buildah add "$ctr2" rpkg/ /usr/share/rpkg
buildah run "$ctr2" --  mkdir -p /var/lib/rpkg/{built,installed,distfiles,packages} /tmp
buildah run "$ctr2" --  mkdir -p /usr/share/rpkg
buildah add "$ctr2" packages/ /var/lib/rpkg/packages

buildah commit "$ctr2" digitalis-stage3
#rm stage3.tar
