#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

sh download_packages.sh


ctr=$(buildah from alpine-bootstrap)

buildah add "$ctr" rpkg/rpkg /
buildah run "$ctr" --  mkdir -p /var/db/rpkg/{built,installed,distfiles,packages}
buildah add "$ctr" packages/ /var/db/rpkg/packages
buildah add "$ctr" distfiles/ /var/db/rpkg/distfiles
buildah add "$ctr" built/ /var/db/rpkg/built

buildah run "$ctr" -- ./rpkg build-without-depends core/fs-tree
buildah run "$ctr" -- ./rpkg build-without-depends core/linux-headers
buildah run "$ctr" -- ./rpkg build-without-depends core/man-pages
buildah run "$ctr" -- ./rpkg build-without-depends core/glibc
buildah run "$ctr" -- ./rpkg build-without-depends core/zlib
buildah run "$ctr" -- ./rpkg build-without-depends core/diffutils
buildah run "$ctr" -- ./rpkg build-without-depends core/bzip2
buildah run "$ctr" -- ./rpkg build-without-depends core/xz
buildah run "$ctr" -- ./rpkg build-without-depends core/file
buildah run "$ctr" -- ./rpkg build-without-depends core/perl
buildah run "$ctr" -- ./rpkg build-without-depends core/texinfo
buildah run "$ctr" -- ./rpkg build-without-depends core/binutils
buildah run "$ctr" -- ./rpkg build-without-depends core/gmp
buildah run "$ctr" -- ./rpkg build-without-depends core/mpfr
buildah run "$ctr" -- ./rpkg build-without-depends core/mpc
buildah run "$ctr" -- ./rpkg build-without-depends core/gcc

# TODO acl goes here (rebuild coreutils)
buildah run "$ctr" -- ./rpkg build-without-depends core/coreutils
buildah run "$ctr" -- ./rpkg build-without-depends core/findutils
buildah run "$ctr" -- ./rpkg build-without-depends core/tar
buildah run "$ctr" -- ./rpkg build-without-depends core/shadow
buildah run "$ctr" -- ./rpkg build-without-depends core/grep
buildah run "$ctr" -- ./rpkg build-without-depends core/sed
buildah run "$ctr" -- ./rpkg build-without-depends core/gawk
buildah run "$ctr" -- ./rpkg build-without-depends core/ncurses
buildah run "$ctr" -- ./rpkg build-without-depends core/procps-ng
buildah run "$ctr" -- ./rpkg build-without-depends core/util-linux
buildah run "$ctr" -- ./rpkg build-without-depends core/which
buildah run "$ctr" -- ./rpkg build-without-depends core/iana-etc

buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/db/rpkg/built/* built/'
buildah umount "$ctr"
buildah rm "$ctr"

