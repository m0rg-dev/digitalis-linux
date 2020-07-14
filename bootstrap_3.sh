#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

sh download_packages.sh

node rpkg/rpkg_repo.js s3repo

maybe_build() {
    echo $1
    [ -e s3repo/builds/$1,*.tar.xz ] || node rpkg/rpkg_build.js s3repo $1 digitalis-bootstrap-2
}

# ctr=$(buildah from digitalis-bootstrap-2)

# buildah run "$ctr" --  mkdir -p /var/lib/rpkg/database /tmp
# buildah run "$ctr" --  mkdir -p /usr/share/rpkg
# cd s3repo;
#     # tar ch follows links
#     tar ch . > /tmp/repo.tar
#     buildah add "$ctr" /tmp/repo.tar /var/lib/rpkg/repo
# cd ..
# buildah add "$ctr" rpkg/ /usr/share/rpkg
# buildah run "$ctr" mkdir -p /target_root/var/lib/rpkg/database

# to_build=$(buildah run "$ctr" node --trace-warnings /usr/share/rpkg/rpkg.js --target_root=/target_root _get_builds_for virtual/base-system)
# to_build="$to_build $(buildah run "$ctr" node --trace-warnings /usr/share/rpkg/rpkg.js --target_root=/target_root _get_builds_for virtual/build-tools)"
# echo $to_build

# buildah rm "$ctr"

# for build in $to_build; do
#     maybe_build $build
# done

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