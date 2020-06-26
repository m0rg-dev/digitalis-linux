#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

ctr=$(buildah from scratch)

buildah copy "$ctr" new_root/ /

buildah add "$ctr" rpkg/rpkg.sh /
buildah run "$ctr" --  mkdir -p /var/db/rpkg/{built,installed,distfiles,packages}
buildah add "$ctr" packages/ /var/db/rpkg/packages
buildah add "$ctr" distfiles/ /var/db/rpkg/distfiles

buildah run "$ctr" -- bash rpkg.sh makefile stage2
buildah run "$ctr" -- make -j56 -k
