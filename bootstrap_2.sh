set -e
set -x

ulimit -n 65536

#sh download_packages.sh

IMAGE=alpine-bootstrap

node x10/x10_repo.js s2repo/

node x10/x10.js --repository=s2repo --without_default_depends --without_hostdb --build_container=$IMAGE build virtual/build-tools
node x10/x10.js --repository=s2repo --without_default_depends --without_hostdb --build_container=$IMAGE build virtual/base-system

ctr=$(buildah from scratch)
for f in $(find s2repo -type f | grep tar.xz); do
    buildah add "$ctr" $f
done
buildah run --net host "$ctr" ldconfig
buildah commit "$ctr" digitalis-bootstrap-2
