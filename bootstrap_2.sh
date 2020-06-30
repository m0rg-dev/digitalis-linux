#!/usr/bin/env bash

set -e
#set -x

ulimit -n 65536

sh download_packages.sh


ctr=$(buildah from alpine-bootstrap)

buildah add "$ctr" rpkg/rpkg /
buildah run "$ctr" -- mkdir -p /var/db/rpkg/{built,installed,distfiles,packages}
buildah run "$ctr" -- mkdir -p /var/lib/rpkg/mod
buildah add "$ctr" rpkg/mod/ /var/lib/rpkg/mod
buildah add "$ctr" packages/ /var/db/rpkg/packages
buildah add "$ctr" distfiles/ /var/db/rpkg/distfiles
buildah add "$ctr" built/ /var/db/rpkg/built

buildah run "$ctr" -- sh -ec "
./rpkg build-without-depends core/fs-tree
./rpkg build-without-depends util/pv
./rpkg build-without-depends kernel/linux-headers
./rpkg build-without-depends doc/man-pages
./rpkg build-without-depends libs/glibc
./rpkg build-without-depends libs/zlib
./rpkg build-without-depends util/diffutils
./rpkg build-without-depends util/bzip2
./rpkg build-without-depends util/xz
./rpkg build-without-depends util/file
./rpkg build-without-depends lang/perl
./rpkg build-without-depends util/texinfo
./rpkg build-without-depends util/binutils
./rpkg build-without-depends libs/gmp
./rpkg build-without-depends libs/mpfr
./rpkg build-without-depends libs/mpc
./rpkg build-without-depends lang/gcc
./rpkg build-without-depends util/gzip
# TODO acl and libattr go here (rebuild coreutils)
./rpkg build-without-depends util/coreutils
./rpkg build-without-depends util/findutils
./rpkg build-without-depends util/tar
./rpkg build-without-depends core/shadow
# TODO pcre goes here (rebuild grep)
./rpkg build-without-depends util/grep
./rpkg build-without-depends lang/sed
./rpkg build-without-depends lang/gawk
./rpkg build-without-depends libs/ncurses
./rpkg build-without-depends util/procps-ng
./rpkg build-without-depends util/util-linux
./rpkg build-without-depends util/which
./rpkg build-without-depends core/iana-etc
./rpkg build-without-depends core/tzdata
./rpkg build-without-depends core/openrc
./rpkg build-without-depends util/pkg-config
./rpkg build-without-depends libs/expat
./rpkg build-without-depends core/dbus
./rpkg build-without-depends libs/readline
./rpkg build-without-depends core/bash
./rpkg build-without-depends util/autoconf
./rpkg build-without-depends core/zsh

./rpkg build-without-depends util/automake
./rpkg build-without-depends util/bc
./rpkg build-without-depends util/bison
./rpkg build-without-depends editor/nano
./rpkg build-without-depends util/m4
./rpkg build-without-depends util/libtool
./rpkg build-without-depends libs/gettext
./rpkg build-without-depends util/flex
./rpkg build-without-depends util/groff
./rpkg build-without-depends util/make
./rpkg build-without-depends util/patch
./rpkg build-without-depends lang/python
"

buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/db/rpkg/built/* built/'
buildah umount "$ctr"
buildah rm "$ctr"

# now open the stage2 container and `buildah add` all the tarfiles
ctr=$(buildah from scratch)
for f in $(find built -type f); do
    echo "Adding: $f"
    buildah add $ctr "$f"
done

buildah run "$ctr" ldconfig
buildah commit "$ctr" "digitalis-stage2"
buildah rm "$ctr"