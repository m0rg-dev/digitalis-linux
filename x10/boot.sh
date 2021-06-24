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
