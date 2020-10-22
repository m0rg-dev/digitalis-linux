#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

mkdir -p /tmp/dnfcache /tmp/repo

build_base_image() {
    ctr=$(buildah from fedora)

    buildah run --net host "$ctr" sh -c 'echo "keepcache=True" >>/etc/dnf/dnf.conf'
    buildah run --net host --volume /tmp/dnfcache:/var/cache/dnf "$ctr" dnf install -y rpm-build createrepo_c
    buildah run --net host "$ctr" sh -c 'echo "%_topdir /rpmbuild" >>~/.rpmmacros'
    buildah run --net host "$ctr" sh -c 'cat >/etc/yum.repos.d/local-bootstrap.repo' <<EOF
[local-bootstrap]
name=local-bootstrap
baseurl=/repo
enabled=1
metadata_expire=1d
gpgcheck=0
EOF
    buildah commit "$ctr" fedora-with-rpm
}

podman images | grep fedora-with-rpm >/dev/null || build_base_image

VOLUMES="--volume $(realpath rpmbuild):/rpmbuild --volume /tmp/dnfcache:/var/cache/dnf"
VOLUMES="$VOLUMES --volume /tmp/repo:/repo"

RPMDEFS="--define='_host x86_64-redhat-linux-gnu' --define='_target x86_64-pc-linux-gnu'"

build_rpm() {
    touch rpmbuild/RPMS/zz-silly-file
    cp -r rpmbuild/RPMS/* /tmp/repo/
    podman run --net host $VOLUMES --rm \
        fedora-with-rpm createrepo_c /repo
    podman run --net host $VOLUMES --rm -it \
        fedora-with-rpm sh -exc \
        "dnf makecache --repo=local-bootstrap; \
         dnf install -y --best --allowerasing \$(rpmspec $RPMDEFS $2 -q --buildrequires /rpmbuild/SPECS/$1.spec); \
         rpmbuild $RPMDEFS $2 -ba /rpmbuild/SPECS/$1.spec"
}

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-binutils-*.rpm ]; then
    build_rpm binutils
fi

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-gcc-*.rpm ]; then
    build_rpm gcc "--without threads --with standalone"
fi

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-kernel-headers-*.rpm ]; then
    build_rpm kernel-headers
fi

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-libstdc++-*.rpm ]; then
    build_rpm libstdc++
fi

RPMDEFS="--define='_build x86_64-redhat-linux-gnu' --define='_host x86_64-pc-linux-gnu' --define='_target x86_64-pc-linux-gnu' --define='dist .digi1'"
# TODO glibc's cross config isn't quite right
# this won't work for a clean build until you fix that and build glibc before libstdc++
if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-glibc-*.rpm ]; then
    build_rpm glibc
fi

RPMS="binutils libstdc++ m4 ncurses"

for rpm in $RPMS; do
    if [ ! -n "$(ls -l rpmbuild/SRPMS/$rpm-*.digi1.*.rpm)" ]; then
        build_rpm $rpm
    fi
done
