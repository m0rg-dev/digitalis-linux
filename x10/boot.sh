#!/bin/bash

set -e
set -x

export X10_NO_GENERATED_DEPS=1

for pkg in $(cat bootstrap); do
    go run . build -maybe pkgs/"$pkg".yml
done
