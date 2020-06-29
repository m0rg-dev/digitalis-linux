#!/usr/bin/env bash

ulimit -n 65536

set -e

ctr=$(buildah from digitalis-stage2)
buildah add "$ctr" rpkg/rpkg /
buildah run "$ctr" -- mkdir -p /var/db/rpkg/{built,installed,distfiles,packages}
buildah run "$ctr" -- mkdir -p /var/lib/rpkg/mod
buildah add "$ctr" rpkg/mod/ /var/lib/rpkg/mod
buildah add "$ctr" packages/ /var/db/rpkg/packages
buildah add "$ctr" distfiles/ /var/db/rpkg/distfiles
buildah add "$ctr" stage3/ /var/db/rpkg/built

buildah run "$ctr" -- mkdir /target_root
buildah run "$ctr" -- ./rpkg build --additional-install-dir=/target_root virtual/base-system

buildah run "$ctr" -- bash -c 'cd /target_root; tar cp .' >stage3.tar
buildah commit "$ctr" "digitalis-stage3-nobuildtools"

buildah run "$ctr" -- ./rpkg build --additional-install-dir=/target_root virtual/build-tools

buildah commit "$ctr" "digitalis-stage3"

mkdir -p stage3
buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/db/rpkg/built/* stage3/'
buildah umount "$ctr"

buildah rm "$ctr"

#ctr=$(buildah from scratch)
#for f in $(find stage3 -type f); do
#    echo "Adding: $f"
#    buildah add $ctr "$f"
#done

#buildah run "$ctr" ldconfig
#buildah commit "$ctr" "digitalis-stage3"
#buildah rm "$ctr"
