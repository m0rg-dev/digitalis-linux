#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

ctr=$(buildah from digitalis-stage3)

buildah add "$ctr" rpkg/rpkg /
buildah run "$ctr" --  mkdir -p /var/db/rpkg/{built,installed,distfiles,packages}
buildah add "$ctr" packages/ /var/db/rpkg/packages
buildah add "$ctr" distfiles/ /var/db/rpkg/distfiles
buildah run "$ctr" -- sh -c "rm -r /var/db/rpkg/built/*"
buildah run "$ctr" -- sh -c "rm -r /var/db/rpkg/installed/*"
buildah add "$ctr" stage3/ /var/db/rpkg/built


buildah run "$ctr" -- ./rpkg $@

buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/db/rpkg/built/* stage3/'
buildah umount "$ctr"
buildah rm "$ctr"

