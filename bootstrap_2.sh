#!/bin/bash

set -e
set -x

make
x10/x10 -config ./etc/x10.bootstrap.conf index

for pkg in $(cat bootstrap); do
    x10/x10 -config ./etc/x10.bootstrap.conf build -maybe pkgs/"$pkg".yml
done

rm -rf targetdir_1/*
mkdir -p targetdir_1

x10/x10 -config ./etc/x10.bootstrap.conf index

for pkg in $(cat bootstrap); do
    x10/x10 -config ./etc/x10.bootstrap.conf install "$pkg" targetdir_1
done

cid=$(buildah from scratch)
buildah commit $cid x10_base
