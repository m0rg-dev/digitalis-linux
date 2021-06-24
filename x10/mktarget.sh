#!/bin/bash

set -e
set -x

cid=$(buildah from digitalis_bootstrap)
function cleanup {
    buildah rm $cid
}
trap cleanup EXIT

mkdir -p targetdir
# do this instead of just rm -rf targetdir/* to avoid permissions issues
podman run --rm -it -v targetdir:/targetdir digitalis_bootstrap rm -rf 'targetdir/*'

buildah run $cid tar c /bin /etc /lib /lib64 /sbin /tmp /usr /var | tar x -C targetdir

cleanup

cid=$(buildah from scratch)
buildah commit $cid x10_base
