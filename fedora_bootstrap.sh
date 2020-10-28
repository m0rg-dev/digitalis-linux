#!/usr/bin/env bash

set -e
set -x

ulimit -n 65536

mkdir -p /tmp/dnfcache /tmp/repo_host/ /tmp/repo_digi1/

build_base_image() {
    ctr=$(buildah from fedora)

    buildah run --net host "$ctr" sh -c 'echo "keepcache=True" >>/etc/dnf/dnf.conf'
    buildah run --net host --volume /tmp/dnfcache:/var/cache/dnf "$ctr" dnf install -y rpm-build createrepo_c
    buildah run --net host "$ctr" sh -c 'echo "%_topdir /rpmbuild" >>~/.rpmmacros'
    buildah run --net host "$ctr" sh -c 'echo "%_unique_build_ids 1" >>~/.rpmmacros'
    buildah run --net host "$ctr" sh -c 'cat >/etc/yum.repos.d/local-bootstrap.repo' <<EOF
[local-bootstrap]
name=local-bootstrap
baseurl=/repo_host
enabled=1
metadata_expire=1d
gpgcheck=0
EOF
    buildah run --net host "$ctr" sh -c 'cat >/etc/yum.repos.d/digitalis-stage1.repo' <<EOF
[digitalis-stage1]
name=digitalis-stage1
baseurl=/repo_digi1
enabled=1
metadata_expire=1d
gpgcheck=0
EOF
    buildah commit "$ctr" fedora-with-rpm
}

podman images | grep fedora-with-rpm >/dev/null || build_base_image

VOLUMES="--volume $(realpath rpmbuild):/rpmbuild --volume /tmp/dnfcache:/var/cache/dnf"
VOLUMES="$VOLUMES --volume /tmp/repo_host:/repo_host --volume /tmp/repo_digi1:/repo_digi1"

RPMDEFS="--define='_host x86_64-redhat-linux-gnu' --define='_target x86_64-pc-linux-gnu'"

REPOS='--disablerepo=digitalis-stage1'

build_rpm() {
    find rpmbuild/RPMS -name '*.fc32.*' -exec cp {} /tmp/repo_host ';'
    find rpmbuild/RPMS -name '*.digi1.*' -exec cp {} /tmp/repo_digi1 ';'
    podman run --net host $VOLUMES --rm fedora-with-rpm createrepo_c /repo_host
    podman run --net host $VOLUMES --rm fedora-with-rpm createrepo_c /repo_digi1
    podman run --net host $VOLUMES --rm -it \
        fedora-with-rpm sh -exc \
        "dnf makecache --repo=local-bootstrap; \
         dnf makecache --repo=digitalis-stage1; \
         dnf install -y --best --allowerasing $REPOS \$(rpmspec $RPMDEFS $2 -q --buildrequires /rpmbuild/SPECS/$1.spec); \
         rpmbuild $RPMDEFS $2 -ba /rpmbuild/SPECS/$1.spec"
}

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-binutils-*.rpm ]; then
    build_rpm binutils
fi

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-standalone-gcc-*.rpm ]; then
    build_rpm gcc "--without threads --with standalone"
fi

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-kernel-headers-*.rpm ]; then
    build_rpm kernel-headers
fi

# LIBRPMS="glibc gcc libstdc++ ncurses gmp mpfr libmpc zlib libgpg-error libgcrypt"
# LIBRPMS="$LIBRPMS file popt libarchive sqlite pkg-config-wrapper lua"
# LIBRPMS="$LIBRPMS cmake-toolchain expat libsolv meson-toolchain libffi glib2 util-linux"
# LIBRPMS="$LIBRPMS check openssl libxml2 curl zchunk python libassuan gpgme"
# LIBRPMS="$LIBRPMS librepo libyaml rpm gtk-doc gobject-introspection libmodulemd"
# LIBRPMS="$LIBRPMS cppunit json-c libdnf"

LIBRPMS="glibc gcc libncurses libgmp libmpfr libmpc"

for rpm in $LIBRPMS; do
    if [ ! -n "$(ls -l rpmbuild/SRPMS/x86_64-pc-linux-gnu-$rpm-*.rpm)" ]; then
        build_rpm $rpm
    fi
done

RPMDEFS="--define='_build x86_64-redhat-linux-gnu' --define='_host x86_64-pc-linux-gnu' --define='_target x86_64-pc-linux-gnu' --define='dist .digi1'"
REPOS=''

# RPMS="binutils libstdc++ m4 ncurses bash coreutils diffutils file findutils"
# RPMS="$RPMS gawk gzip make patch tar sed xz gmp mpfr libmpc gcc bzip2"
# RPMS="$RPMS rpm"

RPMS="binutils libncurses libgmp libmpfr libmpc"

for rpm in $RPMS; do
    if [ ! -n "$(ls -l rpmbuild/SRPMS/$rpm-*.digi1.*.rpm)" ]; then
        build_rpm $rpm
    fi
done
