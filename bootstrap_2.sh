#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

sh download_packages.sh


ctr=$(buildah from alpine-bootstrap)

buildah add "$ctr" rpkg/rpkg /
buildah run "$ctr" --  mkdir -p /var/db/rpkg/{built,installed,distfiles,packages}
buildah add "$ctr" packages/ /var/db/rpkg/packages
buildah add "$ctr" distfiles/ /var/db/rpkg/distfiles
buildah add "$ctr" built/ /var/db/rpkg/built

buildah run "$ctr" -- ./rpkg build-without-depends core/linux-headers
buildah run "$ctr" -- ./rpkg build-without-depends core/man-pages
buildah run "$ctr" -- ./rpkg build-without-depends core/glibc

buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/db/rpkg/built/* built/'
buildah umount "$ctr"
buildah rm "$ctr"

