#!/bin/bash

set -e
set -x

mkdir -pv hostdir_1
cp -ru hostdir_0/distfiles hostdir/

make
x10/x10 -config ./etc/x10.bootstrap3.conf index

rm -fv targetdir_1/var/db/x10/installed
# x10/x10 -config ./etc/x10.bootstrap3.conf:./etc/x10.nodeps.conf build -maybe -with_deps pkgs/sys-libs/glibc.yml
# x10/x10 -config ./etc/x10.bootstrap3.conf:./etc/x10.nodeps.conf install sys-libs/glibc targetdir_1

x10/x10 -config ./etc/x10.bootstrap3.conf:./etc/x10.nodeps.conf build -with_deps pkgs/virtual/base-minimal.yml

uuid=$(uuidgen)
mkdir -p /tmp/x10/targetdir.$uuid
function cleanup {
    rm -rf /tmp/x10/targetdir.$uuid
}
trap cleanup EXIT

echo 'targetdir = ' /tmp/x10/targetdir.$uuid >/tmp/x10/boot.conf
x10/x10 -config ./etc/x10.bootstrap3.conf:/tmp/x10/boot.conf install virtual/base-minimal /tmp/x10/targetdir.$uuid
rm -rf targetdir
mv /tmp/x10/targetdir.$uuid targetdir


false

export X10_TARGETDIR=../targetdir_1
export X10_HOSTDIR=../hostdir_1
export X10_NO_GENERATED_DEPS=1

go run . index
rm -fv ../targetdir_1/var/db/x10/installed
go run . build -maybe -with_deps ../pkgs/sys-libs/glibc.yml ../targetdir_1
go run . install sys-libs/glibc ../targetdir_1

go run . build -with_deps ../pkgs/virtual/base-minimal.yml ../targetdir_1

uuid=$(uuidgen)
mkdir -p /tmp/x10/targetdir.$uuid
function cleanup {
    rm -rf /tmp/x10/targetdir.$uuid
}
trap cleanup EXIT
 
unset X10_NO_GENERATED_DEPS

export X10_TARGETDIR=/tmp/x10/targetdir.$uuid
go run . install virtual/base-minimal /tmp/x10/targetdir.$uuid
rm -rf ../targetdir_2
mv /tmp/x10/targetdir.$uuid ../targetdir_2
