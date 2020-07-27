#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

maybe_build() {
    echo $1
    [ -e s3repo/builds/$1,*.tar.xz ] || node rpkg/rpkg.js --repository=s3repo --without_default_depends build $1 --build_container=digitalis-bootstrap-3 --without_hostdb
}

node rpkg/rpkg_repo.js s3repo

node rpkg/rpkg.js --repository=s3repo --build_container=digitalis-bootstrap-2 build virtual/base-system
node rpkg/rpkg_repo.js s3repo
node rpkg/rpkg.js --repository=s3repo --build_container=digitalis-bootstrap-2 build virtual/build-tools
node rpkg/rpkg_repo.js s3repo

ctr=$(buildah from digitalis-bootstrap-2)

buildah run "$ctr" --  mkdir -p /var/lib/rpkg/database /tmp
buildah run "$ctr" --  mkdir -p /usr/share/rpkg
cd s3repo;
    # tar ch follows links
    tar ch . > /tmp/repo.tar
    buildah add "$ctr" /tmp/repo.tar /var/lib/rpkg/repo
cd ..
buildah add "$ctr" rpkg/ /usr/share/rpkg

buildah run "$ctr" mkdir -p /target_root/var/lib/rpkg/database
buildah run "$ctr" node /usr/share/rpkg/rpkg.js --target_root=/target_root --without_default_dependencies install core/fs-tree
buildah run "$ctr" node /usr/share/rpkg/rpkg.js --target_root=/target_root install virtual/base-system
buildah run "$ctr" node /usr/share/rpkg/rpkg.js --target_root=/target_root install virtual/build-tools

buildah run "$ctr" sh -c 'cd /target_root; tar cp .' > /tmp/stage3.tar
buildah rm "$ctr"

ctr=$(buildah from scratch)
buildah add "$ctr" /tmp/stage3.tar
buildah commit "$ctr" digitalis-builder
buildah rm "$ctr"