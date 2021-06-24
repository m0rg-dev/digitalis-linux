#!/bin/bash

set -e
set -x

podman build -f Dockerfile.deb_bootstrap -t x10_bootstrap .

cid=$(buildah from x10_bootstrap)
function cleanup {
    buildah rm $cid
}
trap cleanup EXIT

mkdir -p targetdir
# do this instead of just rm -rf targetdir/* to avoid permissions issues
podman run --rm -it -v targetdir:/targetdir docker.io/debian:sid rm -rf 'targetdir/*'

buildah run $cid tar c /bin /etc /lib /lib64 /sbin /tmp /usr /var | tar x -C targetdir

cleanup

cid=$(buildah from scratch)
buildah commit $cid x10_base
