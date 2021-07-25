#!/bin/bash

set -e
set -x

BOOT_IMAGE="ghcr.io/m0rg-dev/digitalis-linux:latest"

rm -rf targetdir
mkdir -p targetdir

podman run $BOOT_IMAGE tar c /bin /etc /lib /lib64 /sbin /tmp /usr /var | tar x -C targetdir
