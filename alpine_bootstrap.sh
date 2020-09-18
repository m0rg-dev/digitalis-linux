#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

ctr=$(buildah from alpine)

buildah run --net host "$ctr" -- mkdir /new_root
buildah run --net host "$ctr" -- apk add alpine-sdk gawk bison python3 flex rsync perl texinfo linux-headers

buildah copy "$ctr" $(realpath bootstrap-buildscripts)/ /
buildah copy "$ctr" $(realpath distfiles)/ /

buildah run --net host "$ctr" -- sh -ex build_cross_binutils.sh
buildah run --net host "$ctr" -- sh -ex build_cross_gcc.sh
buildah run --net host "$ctr" -- sh -ex build_linux_headers.sh
buildah run --net host "$ctr" -- sh -ex build_glibc.sh
buildah run --net host "$ctr" -- sh -ex build_binutils.sh
buildah run --net host "$ctr" -- sh -ex build_gcc.sh
buildah run --net host "$ctr" -- sh -ex build_make.sh
buildah run --net host "$ctr" -- sh -ex build_bash.sh
buildah run --net host "$ctr" -- sh -ex build_coreutils.sh
buildah run --net host "$ctr" -- sh -ex build_tar.sh
buildah run --net host "$ctr" -- sh -ex build_gzip.sh
buildah run --net host "$ctr" -- sh -ex build_sed.sh
buildah run --net host "$ctr" -- sh -ex build_grep.sh
buildah run --net host "$ctr" -- sh -ex build_findutils.sh
buildah run --net host "$ctr" -- sh -ex build_gawk.sh
buildah run --net host "$ctr" -- sh -ex build_m4.sh
buildah run --net host "$ctr" -- sh -ex build_bison.sh
buildah run --net host "$ctr" -- sh -ex build_python.sh
buildah run --net host "$ctr" -- sh -ex build_xz.sh

rm -rf new_root
buildah unshare sh -c 'cp -rp $(buildah mount '$ctr')/new_root new_root'
buildah umount "$ctr"
buildah rm "$ctr"

ctr=$(buildah from scratch)

buildah copy "$ctr" $(realpath new_root)/ /
buildah run --net host "$ctr" ldconfig
buildah commit "$ctr" alpine-bootstrap
buildah rm "$ctr"