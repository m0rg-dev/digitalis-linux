set -e
set -x

ulimit -n 65536

mkdir -p live

node x10/x10_repo.js repository
node x10/x10.js --repository=./repository build virtual/base-system kernel/linux
buildah unshare sh -exc '
    ctr=$(buildah from scratch)
    dir=$(buildah mount "$ctr")

    mkdir -p $dir/var/lib/x10/database

    node x10/x10.js --repository=$(realpath ./repository) --target_root="$dir" --without_default_depends install core/fs-tree
    node x10/x10.js --repository=$(realpath ./repository) --target_root="$dir" --without_default_depends install virtual/base-system

    mkdir -p $dir/usr/share/x10
    cp -r x10/* $dir/usr/share/x10
    cp -r repository $dir/var/lib/x10/repo

    buildah run "$ctr" node /usr/share/x10/x10.js --without_default_depends install kernel/linux

    ls $dir

    buildah umount $ctr
    buildah rm $ctr
'