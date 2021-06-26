#!/bin/bash

set -e
set -x

export X10_NO_GENERATED_DEPS=1
export X10_TARGETDIR=targetdir_boot

# TODO
go run . index

for pkg in $(cat bootstrap); do
    go run . build -maybe pkgs/"$pkg".yml
done

rm -rf targetdir/*
mkdir -p targetdir

go run . index

for pkg in $(cat bootstrap); do
    go run . install "$pkg" targetdir
done

X10_TARGETDIR=targetdir go run . index

cid=$(buildah from scratch)
buildah commit $cid x10_base
