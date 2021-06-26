#!/bin/bash

set -e
set -x

export X10_TARGETDIR=targetdir
export X10_NO_GENERATED_DEPS=1

go run . index
go run . build -with_deps pkgs/virtual/base-minimal.yml targetdir

uuid=$(uuidgen)
mkdir -p /tmp/x10/targetdir.$uuid
function cleanup {
    rm -rf /tmp/x10/targetdir.$uuid
}
trap cleanup EXIT
 
unset X10_NO_GENERATED_DEPS

go run . install virtual/base-minimal /tmp/x10/targetdir.$uuid
rm -rf targetdir
mv /tmp/x10/targetdir.$uuid targetdir
