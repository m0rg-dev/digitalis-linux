set -e
set -x

ulimit -n 65536

mkdir -p live

node rpkg/rpkg_repo.js repository
node rpkg/rpkg.js --repository=./repository build virtual/base-system kernel/linux
buildah unshare sh -exc '
    ctr=$(buildah from scratch)
    dir=$(buildah mount "$ctr")

    mkdir -p $dir/var/lib/rpkg/database

    node rpkg/rpkg.js --repository=$(realpath ./repository) --target_root="$dir" --without_default_depends install core/fs-tree
    node rpkg/rpkg.js --repository=$(realpath ./repository) --target_root="$dir" --without_default_depends install virtual/base-system

    mkdir -p $dir/usr/share/rpkg
    cp -r rpkg/* $dir/usr/share/rpkg
    cp -r repository $dir/var/lib/rpkg/repo

    buildah run "$ctr" node /usr/share/rpkg/rpkg.js --without_default_depends install kernel/linux

    ls $dir

    buildah umount $ctr
    buildah rm $ctr
'