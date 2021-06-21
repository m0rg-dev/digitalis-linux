#!/usr/bin/env bash

set -e
set -o pipefail

./x10 pkgs/buildroot.sh package
TOP_PKG=$(./x10 pkgs/buildroot.sh hash)

declare -A already_checked

recurse_imports() {
    local hash=$1; shift
    if [[ -z ${already_checked[$hash]} ]]; then
        for import in $(tar xJf builtpkgs/$hash.tar.xz -O x10/tree/$hash/import); do
            echo "$hash => $import" >&2
            recurse_imports $import
        done
        already_checked[$hash]=1
    fi
    echo $hash
}

mkdir -p sysroot
chmod -R +w sysroot
rm -rf sysroot
mkdir -p sysroot

# TODO this should be managed by some kinda "fhs" package
mkdir -p sysroot/{bin,lib64}

for pkg in $(recurse_imports $TOP_PKG | sort -u); do
    tar xJf builtpkgs/$pkg.tar.xz -C sysroot
    tar xJf builtpkgs/$pkg.scripts.tar.xz -C sysroot
    if [ -e sysroot/x10/tree/$pkg/bin ]; then
        for f in $(ls sysroot/x10/tree/$pkg/bin); do
            ln -sv /x10/tree/$pkg/bin/$f sysroot/bin/$f
        done
    fi
    if [ -e sysroot/x10/tree/$pkg/lib64/ld-linux-x86-64.so.2 ]; then
        ln -svr sysroot/x10/tree/$pkg/lib64/ld-linux-x86-64.so.2 sysroot/lib64/ld-linux-x86-64.so.2
    fi
    if [ -e sysroot/x10/tree/$pkg/lib ]; then
        for f in $(find -L sysroot/x10/tree/$pkg/lib -type f | xargs -n1 realpath -s --relative-to=sysroot/x10/tree/$pkg/lib); do
            mkdir -p sysroot/lib/$(dirname $f)
            ln -sv /x10/tree/$pkg/lib/$f sysroot/lib/$f
        done
    fi
    if [ -e sysroot/x10/tree/$pkg/include ]; then
        for f in $(find -L sysroot/x10/tree/$pkg/include -type f | xargs -n1 realpath -s --relative-to=sysroot/x10/tree/$pkg/include); do
            mkdir -p sysroot/usr/include/$(dirname $f)
            ln -sv /x10/tree/$pkg/include/$f sysroot/usr/include/$f
        done
    fi
    if [ -e sysroot/x10/tree/$pkg/share ]; then
        for f in $(find -L sysroot/x10/tree/$pkg/share -type f | xargs -n1 realpath -s --relative-to=sysroot/x10/tree/$pkg/share); do
            mkdir -p sysroot/usr/share/$(dirname $f)
            ln -sv /x10/tree/$pkg/share/$f sysroot/usr/share/$f
        done
    fi
done

ln -sv ../bin sysroot/usr/bin
ln -sv ../lib sysroot/usr/lib
ln -sv /bin/cpp sysroot/lib/cpp 
mkdir sysroot/tmp
