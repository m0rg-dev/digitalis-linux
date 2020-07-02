#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

ctr=$(buildah from alpine)

buildah run "$ctr" -- mkdir /new_root
buildah run "$ctr" -- apk add alpine-sdk gawk bison python3 flex rsync perl texinfo linux-headers

buildah add "$ctr" distfiles/ bootstrap-buildscripts/ /

buildah run "$ctr" -- sh -ex build_cross_binutils.sh
buildah run "$ctr" -- sh -ex build_cross_gcc.sh
buildah run "$ctr" -- sh -ex build_linux_headers.sh
buildah run "$ctr" -- sh -ex build_glibc.sh
buildah run "$ctr" -- sh -ex build_binutils.sh
buildah run "$ctr" -- sh -ex build_gcc.sh
buildah run "$ctr" -- sh -ex build_make.sh
buildah run "$ctr" -- sh -ex build_bash.sh
buildah run "$ctr" -- sh -ex build_coreutils.sh
buildah run "$ctr" -- sh -ex build_tar.sh
buildah run "$ctr" -- sh -ex build_gzip.sh
buildah run "$ctr" -- sh -ex build_sed.sh
buildah run "$ctr" -- sh -ex build_grep.sh
buildah run "$ctr" -- sh -ex build_findutils.sh
buildah run "$ctr" -- sh -ex build_gawk.sh
buildah run "$ctr" -- sh -ex build_m4.sh
buildah run "$ctr" -- sh -ex build_bison.sh
buildah run "$ctr" -- sh -ex build_python.sh
buildah run "$ctr" -- sh -ex build_xz.sh
buildah run "$ctr" -- sh -ex build_node.sh
buildah run "$ctr" -- sh -ex build_pv.sh

rm -rf new_root
buildah unshare sh -c 'cp -rp $(buildah mount '$ctr')/new_root new_root'
buildah umount "$ctr"
buildah rm "$ctr"

ctr=$(buildah from scratch)

buildah copy "$ctr" new_root/ /
buildah commit "$ctr" alpine-bootstrap
buildah rm "$ctr"