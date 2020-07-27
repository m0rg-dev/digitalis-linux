#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

maybe_build() {
    echo $1
    [ -e s3repo/builds/$1,*.tar.xz ] || node x10/x10.js --repository=s3repo --without_default_depends build $1 --build_container=digitalis-bootstrap-3 --without_hostdb
}

node x10/x10_repo.js s3repo

node x10/x10.js --repository=s3repo --build_container=digitalis-bootstrap-2 build virtual/base-system
node x10/x10_repo.js s3repo
node x10/x10.js --repository=s3repo --build_container=digitalis-bootstrap-2 build virtual/build-tools
node x10/x10_repo.js s3repo

ctr=$(buildah from digitalis-bootstrap-2)

buildah run "$ctr" --  mkdir -p /var/lib/x10/database /tmp
buildah run "$ctr" --  mkdir -p /usr/share/x10
cd s3repo;
    # tar ch follows links
    tar ch . > /tmp/repo.tar
    buildah add "$ctr" /tmp/repo.tar /var/lib/x10/repo
cd ..
buildah add "$ctr" x10/ /usr/share/x10

buildah run "$ctr" mkdir -p /target_root/var/lib/x10/database
buildah run "$ctr" node /usr/share/x10/x10.js --target_root=/target_root --without_default_dependencies install core/fs-tree
buildah run "$ctr" node /usr/share/x10/x10.js --target_root=/target_root install virtual/base-system
buildah run "$ctr" node /usr/share/x10/x10.js --target_root=/target_root install virtual/build-tools

buildah run "$ctr" sh -c 'cd /target_root; tar cp .' > /tmp/stage3.tar
buildah rm "$ctr"

ctr=$(buildah from scratch)
buildah add "$ctr" /tmp/stage3.tar
buildah commit "$ctr" digitalis-builder
buildah rm "$ctr"