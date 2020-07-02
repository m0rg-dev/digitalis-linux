#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

# sh build_in_container.sh alpine-bootstrap stage2/ install linux-headers

source=$1
shift
target=$1
shift

ctr=$(buildah from $source)

buildah run "$ctr" --  mkdir -p /var/lib/rpkg/{built,installed,distfiles,packages} /tmp
buildah run "$ctr" --  mkdir -p /usr/share/rpkg
buildah add "$ctr" packages/ /var/lib/rpkg/packages
buildah add "$ctr" distfiles/ /var/lib/rpkg/distfiles
buildah run "$ctr" -- sh -c "rm -rf /var/lib/rpkg/built/*"
buildah run "$ctr" -- sh -c "rm -rf /var/lib/rpkg/installed/*"
if [ -e $target ]; then
    buildah add "$ctr" $target/ /var/lib/rpkg/built
fi
buildah add "$ctr" rpkg/ /usr/share/rpkg

buildah run "$ctr" -- node /usr/share/rpkg/rpkg.js $@

mkdir -p $target/
buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/lib/rpkg/built/* '$target/ || true
buildah umount "$ctr"
buildah rm "$ctr"

