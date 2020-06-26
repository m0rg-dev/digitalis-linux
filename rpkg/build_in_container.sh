#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

ctr=$(buildah from alpine-bootstrap)

buildah add "$ctr" rpkg/rpkg.sh /
buildah run "$ctr" --  mkdir -p /var/db/rpkg/{built,installed,distfiles,packages}
buildah add "$ctr" packages/ /var/db/rpkg/packages
buildah add "$ctr" distfiles/ /var/db/rpkg/distfiles
buildah add "$ctr" built/ /var/db/rpkg/built

buildah run "$ctr" -- bash rpkg.sh makefile $1
#buildah run "$ctr" -- cat Makefile 
buildah run "$ctr" -- make
#buildah run "$ctr" -- ls -l /var/db/rpkg/{built,installed}

buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/db/rpkg/built/* built/'
buildah umount "$ctr"
buildah rm "$ctr"

