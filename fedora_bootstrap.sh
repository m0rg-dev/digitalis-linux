#!/usr/bin/env bash

#TODO this is an awful mess

set -e
set -x

ulimit -n 65536

mkdir -p /tmp/dnfcache /tmp/repo_host/ /tmp/repo_digi1/ /tmp/repo_digi2/

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

BASE_VOLUMES="--volume $(realpath rpmbuild):/rpmbuild"
VOLUMES="$BASE_VOLUMES --volume /tmp/dnfcache:/var/cache/dnf --volume /tmp/repo_host:/repo_host"

RPMDEFS="--define='_host x86_64-redhat-linux-gnu' --define='_target x86_64-pc-linux-gnu' --define='_fedora_dependencies 1'"

IMAGE='fedora-with-rpm'
DIST='fc32'
REPO='repo_host'
MAKECACHE_REPOS='local-bootstrap'
ADDITIONAL_DNF_ARGS='--disablerepo digitalis-stage1'

refresh_repo() {
    find rpmbuild/RPMS -name '*.'$DIST'.*' -exec cp {} /tmp/$REPO ';'
    podman run --net host $VOLUMES --rm $IMAGE createrepo_c /$REPO
}

build_rpm() {
    podman run --net host $VOLUMES --rm -it \
        $IMAGE sh -exc \
        "dnf makecache --repo='$MAKECACHE_REPOS'; \
         dnf install -y --best --allowerasing $ADDITIONAL_DNF_ARGS \$(rpmspec $RPMDEFS $2 -q --buildrequires /rpmbuild/SPECS/$1.spec); \
         rpmbuild --verbose $RPMDEFS $2 -ba /rpmbuild/SPECS/$1.spec"
}

STAGE1_MODIFIED=''
refresh_repo

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-binutils-*.rpm ]; then
    build_rpm binutils
    refresh_repo
    STAGE1_MODIFIED=1
fi

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-standalone-gcc-*.rpm ]; then
    refresh_repo
    build_rpm gcc "--without threads --with standalone"
    refresh_repo
    STAGE1_MODIFIED=1
fi

if [ ! -e rpmbuild/SRPMS/x86_64-pc-linux-gnu-kernel-headers-*.rpm ]; then
    build_rpm kernel-headers
    refresh_repo
    STAGE1_MODIFIED=1
fi

LIBRPMS="glibc gcc"
LIBRPMS="$LIBRPMS libncurses libgmp libmpfr libmpc zlib libgpg-error libgcrypt"
LIBRPMS="$LIBRPMS file libpopt bzip2 xz libarchive libsqlite lua libexpat libzstd libelf libffi python rpm"
LIBRPMS="$LIBRPMS libsolv glib2 util-linux libcheck libopenssl libtasn1 p11-kit curl"
LIBRPMS="$LIBRPMS libzchunk libassuan libgpgme libxml2 librepo libyaml"
LIBRPMS="$LIBRPMS gtk-doc libgobject-introspection libmodulemd libcppunit"
LIBRPMS="$LIBRPMS libjson-c libdnf libcomps libksba libnpth libpcre linux-pam"

echo "#### Building .fc32 packages ####"
DIST='fc32'

for rpm in pkg-config-wrapper cmake-toolchain meson-toolchain $LIBRPMS; do
    if [ ! -n "$(ls -l rpmbuild/SRPMS/x86_64-pc-linux-gnu-$rpm-*.rpm)" ]; then
        build_rpm $rpm
        refresh_repo
        STAGE1_MODIFIED=1
    fi
done

RPMDEFS="--define='_build x86_64-redhat-linux-gnu' --define='_host x86_64-pc-linux-gnu' --define='_target x86_64-pc-linux-gnu' --define='dist .digi1'"

RPMS="$LIBRPMS"

RPMS="$RPMS binutils gcc bash fs-tree coreutils kernel-headers perl dnf"
RPMS="$RPMS createrepo_c make sed bison tar grep gawk m4 gzip findutils"
RPMS="$RPMS diffutils texinfo pkgconf cmake patch autoconf automake"
RPMS="$RPMS libtool setuptools meson asciidoc ninja-build gnupg swig which"
RPMS="$RPMS xml-common docbook-dtds libxslt docbook-style-xsl flex shadow"
RPMS="$RPMS tzdata groff cpio make-ca bc procps inetutils iproute2 dhcpcd"
RPMS="$RPMS iana-etc nano"
RPMS="$RPMS digitalis-bootstrap-repository"

RPMS="$RPMS base-system"

echo "#### Building .digi1 packages ####"
DIST='digi1'

for rpm in $RPMS; do
    if [ ! -n "$(ls -l rpmbuild/SRPMS/$rpm-*.digi1.*.rpm)" ]; then
        build_rpm $rpm
        STAGE1_MODIFIED=1
    fi
done

VOLUMES="$BASE_VOLUMES --volume /tmp/repo_digi1:/repo_digi1"
ADDITIONAL_DNF_ARGS=''
DIST='digi1'
REPO='repo_digi1'
refresh_repo

if [[ -n $STAGE1_MODIFIED ]]; then

    ctr=$(buildah from fedora-with-rpm)
    buildah run --net host $VOLUMES "$ctr" -- mkdir /new_root
    buildah run --net host $VOLUMES "$ctr" -- dnf install -y \
        --verbose --repo=digitalis-stage1 --installroot=/new_root --releasever=digi1 \
        fs-tree
    buildah run --net host $VOLUMES "$ctr" -- dnf install -y \
        --verbose --repo=digitalis-stage1 --installroot=/new_root --releasever=digi1 \
        digitalis-bootstrap-repository base-system

    find new_root -type d | xargs -r chmod u+w
    rm -rf new_root
    buildah unshare sh -c 'cp -rp $(buildah mount '$ctr')/new_root new_root'
    buildah umount "$ctr"
    buildah rm "$ctr"

    VOLUMES='--volume /tmp/repo_digi1:/repo'

    ctr=$(buildah from scratch)

    buildah copy "$ctr" $(realpath new_root)/ /
    buildah run --net host $VOLUMES "$ctr" -- dnf install -y --releasever=digi1 \
        fs-tree digitalis-bootstrap-repository base-system createrepo_c
    buildah run --net host "$ctr" sh -c 'echo "%_topdir /rpmbuild" >>~/.rpmmacros'
    buildah commit "$ctr" digitalis-stage1
    buildah rm "$ctr"
fi

VOLUMES="$BASE_VOLUMES --volume /tmp/repo_digi1:/repo"

echo "#### Building .digi2 packages ####"
DIST='digi2'

REPO='repo_digi2'
DIST='digi2'
IMAGE='digitalis-stage1'
RPMDEFS="--define='_build x86_64-pc-linux-gnu' --define='_host x86_64-pc-linux-gnu' --define='_target x86_64-pc-linux-gnu' --define='dist .digi2'"
MAKECACHE_REPOS="digitalis"

RPMS="$RPMS openrc grub eudev udev-init-scripts kernel mkinitcpio mkinitcpio-busybox"
RPMS="$RPMS e2fsprogs kbd bare-metal"

for rpm in $RPMS; do
    if [ ! -n "$(ls rpmbuild/SRPMS | grep -P $rpm-'\d.*\.digi2\..*\.rpm')" ]; then
        build_rpm $rpm
    fi
done
VOLUMES='--volume /tmp/repo_digi2:/repo_digi2'
refresh_repo

VOLUMES='--volume /tmp/repo_digi2:/repo'

ctr=$(buildah from digitalis-stage1)
buildah run --net host $VOLUMES "$ctr" -- mkdir /new_root
buildah run --net host $VOLUMES "$ctr" -- dnf install -y \
    --verbose --repo=digitalis --installroot=/new_root --releasever=digi2 \
    fs-tree
buildah run --net host $VOLUMES "$ctr" -- dnf install -y \
    --verbose --repo=digitalis --installroot=/new_root --releasever=digi2 \
    digitalis-bootstrap-repository base-system

find new_root -type d | xargs -r chmod u+w
rm -rf new_root
buildah unshare sh -c 'cp -rp $(buildah mount '$ctr')/new_root new_root'
buildah umount "$ctr"
buildah rm "$ctr"

ctr=$(buildah from scratch)

buildah copy "$ctr" $(realpath new_root)/ /
buildah run --net host $VOLUMES "$ctr" -- dnf install -y --releasever=digi2 \
    fs-tree digitalis-bootstrap-repository base-system
buildah run --net host "$ctr" sh -c 'echo "%_topdir /rpmbuild" >>~/.rpmmacros'
buildah commit "$ctr" digitalis
buildah rm "$ctr"