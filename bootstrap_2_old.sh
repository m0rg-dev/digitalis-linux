#!/usr/bin/env bash

set -e
#set -x

ulimit -n 65536

sh download_packages.sh


ctr=$(buildah from alpine-bootstrap)

buildah run "$ctr" --  mkdir -p /var/lib/rpkg/{built,installed,distfiles,packages} /tmp
buildah run "$ctr" --  mkdir -p /usr/share/rpkg
buildah add "$ctr" packages/ /var/lib/rpkg/packages
buildah add "$ctr" distfiles/ /var/lib/rpkg/distfiles
buildah run "$ctr" -- sh -c "rm -rf /var/lib/rpkg/built/*"
buildah run "$ctr" -- sh -c "rm -rf /var/lib/rpkg/installed/*"
if [ -e stage2 ]; then
    buildah add "$ctr" stage2/ /var/lib/rpkg/built
fi
buildah add "$ctr" rpkg/ /usr/share/rpkg

# There are a few dependencies in the base-system or build-tools sets that have to
# be built first. rpkg isn't capable of figuring it out on its own (the "there are literally
# 0 packages installed on the host system" case kinda puts it in GIGO mode, though it does
# better than it might), so let's set them up manually.
packages="core/fs-tree kernel/linux-headers libs/glibc libs/zlib util/diffutils lang/perl \
    util/texinfo util/binutils util/libtool libs/gmp libs/mpfr libs/mpc lang/gcc libs/ncurses \
    util/gzip util/xz util/bzip2 util/autoconf lang/python util/which"

for package in $packages; do
    if [ -e stage2/$package@*.tar.xz ]; then
        echo "$package already built"
        buildah run "$ctr" -- node /usr/share/rpkg/rpkg.js host_install $package
    else
        buildah run "$ctr" -- sh -ec "node /usr/share/rpkg/rpkg.js build $package; node /usr/share/rpkg/rpkg.js host_install $package"
    fi
done

buildah run "$ctr" -- node /usr/share/rpkg/rpkg.js --skip_confirm --without_default_depends install build-tools coreutils

buildah run "$ctr" -- mkdir -p /new_root
buildah run "$ctr" -- node /usr/share/rpkg/rpkg.js --skip_confirm --without_default_depends --target_root=/new_root install base-system
buildah run "$ctr" -- node /usr/share/rpkg/rpkg.js --skip_confirm --without_default_depends --target_root=/new_root install build-tools
buildah run "$ctr" -- node /usr/share/rpkg/rpkg.js --skip_confirm --without_default_depends --target_root=/new_root install libelf cpio kmod dracut

mkdir -p stage2/
buildah unshare sh -c 'cp -urpv $(buildah mount '$ctr')/var/lib/rpkg/built/* 'stage2/ || true
buildah umount "$ctr"

ctr2=$(buildah from scratch)
buildah run "$ctr" -- sh -c 'cd /new_root; tar cp .' > stage2.tar
buildah add "$ctr2" stage2.tar
buildah rm "$ctr"

buildah add "$ctr2" rpkg/ /usr/share/rpkg
buildah run "$ctr2" --  mkdir -p /var/lib/rpkg/{built,installed,distfiles,packages} /tmp
buildah run "$ctr2" --  mkdir -p /usr/share/rpkg
buildah add "$ctr2" packages/ /var/lib/rpkg/packages
buildah add "$ctr2" distfiles/ /var/lib/rpkg/distfiles
# need to run this in the final container because dracut is finicky
buildah run "$ctr2" -- node /usr/share/rpkg/rpkg.js --skip_confirm install kernel/linux

buildah commit "$ctr2" digitalis-stage2
rm stage2.tar
