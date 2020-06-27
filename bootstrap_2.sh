#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

sh download_packages.sh


ctr=$(buildah from alpine-bootstrap)

buildah add "$ctr" rpkg/rpkg /
buildah run "$ctr" --  mkdir -p /var/db/rpkg/{built,installed,distfiles,packages}
buildah run "$ctr" -- mkdir -p /var/lib/rpkg/mod
buildah add "$ctr" rpkg/mod/ /var/lib/rpkg/mod
buildah add "$ctr" packages/ /var/db/rpkg/packages
buildah add "$ctr" distfiles/ /var/db/rpkg/distfiles
buildah add "$ctr" built/ /var/db/rpkg/built

buildah run "$ctr" -- ./rpkg build-without-depends core/fs-tree
buildah run "$ctr" -- ./rpkg build-without-depends util/pv
buildah run "$ctr" -- ./rpkg build-without-depends kernel/linux-headers
buildah run "$ctr" -- ./rpkg build-without-depends doc/man-pages
buildah run "$ctr" -- ./rpkg build-without-depends libs/glibc
buildah run "$ctr" -- ./rpkg build-without-depends libs/zlib
buildah run "$ctr" -- ./rpkg build-without-depends util/diffutils
buildah run "$ctr" -- ./rpkg build-without-depends util/bzip2
buildah run "$ctr" -- ./rpkg build-without-depends util/xz
buildah run "$ctr" -- ./rpkg build-without-depends util/file
buildah run "$ctr" -- ./rpkg build-without-depends lang/perl
buildah run "$ctr" -- ./rpkg build-without-depends util/texinfo
buildah run "$ctr" -- ./rpkg build-without-depends util/binutils
buildah run "$ctr" -- ./rpkg build-without-depends libs/gmp
buildah run "$ctr" -- ./rpkg build-without-depends libs/mpfr
buildah run "$ctr" -- ./rpkg build-without-depends libs/mpc
buildah run "$ctr" -- ./rpkg build-without-depends lang/gcc
# TODO acl and libattr go here (rebuild coreutils)
buildah run "$ctr" -- ./rpkg build-without-depends util/coreutils
buildah run "$ctr" -- ./rpkg build-without-depends util/findutils
buildah run "$ctr" -- ./rpkg build-without-depends util/tar
buildah run "$ctr" -- ./rpkg build-without-depends core/shadow
# TODO pcre goes here (rebuild grep)
buildah run "$ctr" -- ./rpkg build-without-depends util/grep
buildah run "$ctr" -- ./rpkg build-without-depends lang/sed
buildah run "$ctr" -- ./rpkg build-without-depends lang/gawk
buildah run "$ctr" -- ./rpkg build-without-depends libs/ncurses
buildah run "$ctr" -- ./rpkg build-without-depends util/procps-ng
buildah run "$ctr" -- ./rpkg build-without-depends util/util-linux
buildah run "$ctr" -- ./rpkg build-without-depends util/which
buildah run "$ctr" -- ./rpkg build-without-depends core/iana-etc
buildah run "$ctr" -- ./rpkg build-without-depends core/tzdata
buildah run "$ctr" -- ./rpkg build-without-depends core/openrc
buildah run "$ctr" -- ./rpkg build-without-depends core/bash
buildah run "$ctr" -- ./rpkg build-without-depends util/autoconf
buildah run "$ctr" -- ./rpkg build-without-depends core/zsh

buildah run "$ctr" -- ./rpkg build-without-depends util/automake

buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/db/rpkg/built/* built/'
buildah umount "$ctr"
buildah rm "$ctr"

