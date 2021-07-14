#!/bin/bash

set -e
set -x

podman --cgroup-manager=cgroupfs build -f Dockerfile.deb_bootstrap -t x10_bootstrap .

cid=$(buildah from x10_bootstrap)
function cleanup {
    buildah rm $cid
}
trap cleanup EXIT

mkdir -p targetdir_0
rm -rf targetdir_0/*

buildah run $cid tar c /bin /etc /lib /lib64 /sbin /tmp /usr /var | tar x -C targetdir_0
ln -s /bin/bash targetdir_0/usr/bin/bash

cleanup

cid=$(buildah from scratch)
buildah commit $cid x10_base
