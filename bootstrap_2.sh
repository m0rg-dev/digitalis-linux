set -e
set -x

ulimit -n 65536

#sh download_packages.sh

IMAGE=alpine-bootstrap

node x10/x10_repo.js s2repo/

maybe_build() {
    echo $1
    [ -e s2repo/builds/$1,*.tar.xz ] || node x10/x10.js --repository=s2repo --without_default_depends build $1 --build_container=$IMAGE --without_hostdb
}

commit_with_packages() {
    local ctr=$(buildah from $IMAGE)
    buildah run "$ctr" --  mkdir -p /var/lib/x10/database /tmp
    buildah run "$ctr" --  mkdir -p /usr/share/x10
    node x10/x10_repo.js s2repo/

    cd s2repo;
        # tar ch follows links
        tar ch . > /tmp/repo.tar
        buildah add "$ctr" /tmp/repo.tar /var/lib/x10/repo
    cd ..
    buildah add "$ctr" x10/ /usr/share/x10

    for package in $2; do
        # TODO this line is too long.
        buildah unshare sh -c "mp=\$(buildah mount $ctr); echo \$mp;ls -ld \$mp/var/lib/x10;node x10/x10.js --without_default_depends --without_hostdb --target_root=\$mp --repository=\$mp/var/lib/x10/repo install $package"
    done
    buildah commit "$ctr" $1
    buildah rm "$ctr"

    IMAGE=$1
}

maybe_build core/fs-tree
maybe_build kernel/linux-headers

commit_with_packages digitalis-bootstrap-1.1 "core/fs-tree kernel/linux-headers"

maybe_build libs/glibc
maybe_build util/diffutils
maybe_build lang/perl
maybe_build libs/gmp

commit_with_packages digitalis-bootstrap-1.2 "libs/glibc util/diffutils lang/perl libs/gmp"

maybe_build libs/mpfr
maybe_build util/texinfo
maybe_build libs/zlib

commit_with_packages digitalis-bootstrap-1.3 "libs/mpfr util/texinfo libs/zlib"

maybe_build util/binutils
maybe_build libs/mpc
maybe_build util/autoconf
maybe_build util/bzip2

commit_with_packages digitalis-bootstrap-1.4 "util/binutils libs/mpc util/autoconf util/bzip2"

maybe_build libs/ncurses
maybe_build util/libtool
maybe_build lang/gcc
maybe_build libs/gettext
maybe_build util/automake
maybe_build libs/expat
maybe_build util/pkg-config

commit_with_packages digitalis-bootstrap-1.5 "libs/ncurses util/libtool lang/gcc util/automake libs/gettext libs/expat util/pkg-config"

# TODO auto-generate this from build-tools
pkgs_16="
kernel/linux-headers
lang/gcc
lang/perl
lang/python
libs/gettext
util/autoconf
util/bc
util/binutils
util/bison
util/bzip2
util/flex
util/groff
util/gzip
util/libtool
util/m4
util/make
util/patch
util/pkg-config
util/texinfo
util/xz
"

pkgs_16="$pkgs_16 util/gperf util/which util/util-linux core/dbus libs/readline util/coreutils libs/openssl libs/libattr lang/node"

for pkg in $pkgs_16; do maybe_build $pkg; done

commit_with_packages digitalis-bootstrap-1.6 "$pkgs_16"

node x10/x10_repo.js s2repo

ctr=$(buildah from $IMAGE)
buildah run "$ctr" --  mkdir -p /var/lib/x10/database /tmp
buildah run "$ctr" --  mkdir -p /usr/share/x10
cd s2repo;
    # tar ch follows links
    tar ch . > /tmp/repo.tar
    buildah add "$ctr" /tmp/repo.tar /var/lib/x10/repo
cd ..
buildah add "$ctr" x10/ /usr/share/x10

to_build=$(buildah run "$ctr" node --trace-warnings /usr/share/x10/x10.js _get_builds_for virtual/base-system)
echo $to_build

buildah rm "$ctr"

for build in $to_build; do
    maybe_build $build
done

commit_with_packages digitalis-bootstrap-1.7 "$to_build"

node x10/x10_repo.js s2repo

ctr=$(buildah from $IMAGE)

buildah run "$ctr" --  mkdir -p /var/lib/x10/database /tmp
buildah run "$ctr" --  mkdir -p /usr/share/x10
cd s2repo;
    # tar ch follows links
    tar ch . > /tmp/repo.tar
    buildah add "$ctr" /tmp/repo.tar /var/lib/x10/repo
cd ..
buildah add "$ctr" x10/ /usr/share/x10

buildah run "$ctr" mkdir -p /target_root/var/lib/x10/database
buildah run "$ctr" node /usr/share/x10/x10.js --target_root=/target_root install virtual/base-system
buildah run "$ctr" node /usr/share/x10/x10.js --target_root=/target_root install virtual/build-tools

# Required to build core/eudev. Maybe someday we can handle these in an organized manner
buildah run "$ctr" node /usr/share/x10/x10.js --target_root=/target_root install util/gperf

buildah run "$ctr" sh -c 'cd /target_root; tar cp .' > /tmp/stage2.tar
buildah rm "$ctr"

ctr=$(buildah from scratch)
buildah add "$ctr" /tmp/stage2.tar
buildah commit "$ctr" digitalis-bootstrap-2
