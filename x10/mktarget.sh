#!/bin/bash

set -e
set -x

export X10_NO_GENERATED_DEPS=1
export X10_TARGETDIR=../targetdir_0
export X10_HOSTDIR=../hostdir_0

# TODO
go run . index

for pkg in $(cat bootstrap); do
    go run . build -maybe ../pkgs/"$pkg".yml
done

rm -rf ../targetdir_1/*
mkdir -p ../targetdir_1

go run . index

for pkg in $(cat bootstrap); do
    go run . install "$pkg" ../targetdir_1
done

X10_TARGETDIR=../targetdir_1 go run . index

cid=$(buildah from scratch)
buildah commit $cid x10_base
