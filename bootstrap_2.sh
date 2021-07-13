#!/bin/bash

set -e
set -x

cd $(dirname $0)
make

for pkg in $(cat bootstrap); do
    x10/x10 --repo bootstrap-repo \
            --packages pkgs \
            --no-use-generated \
            build $pkg \
            --target-root targetdir_0 \
            --no-reset
done

rm -rf targetdir_1/*
mkdir -p targetdir_1

mkdir -p targetdir_1/var/db/x10
cp targetdir_0/var/db/x10/pkgdb.yml targetdir_1/var/db/x10/

for pkg in $(cat bootstrap); do
    x10/x10 --repo bootstrap-repo --packages pkgs --no-use-generated install "$pkg" targetdir_1
done

cid=$(buildah from scratch)
buildah commit $cid x10_base
