set -e
set -o pipefail

./x10 pkgs/buildroot.sh package
TOP_PKG=$(./x10 pkgs/buildroot.sh hash)

recurse_imports() {
    local hash=$1; shift
    for import in $(tar xf builtpkgs/$hash.tar.gz -O x10/tree/$hash/import); do
        echo "$hash => $import" >&2
        recurse_imports $import
    done
    echo $hash
}

rm -rf sysroot
mkdir -p sysroot

# TODO this should be managed by some kinda "fhs" package
mkdir -p sysroot/{bin,lib64}

for pkg in $(recurse_imports $TOP_PKG | sort -u); do
    tar xf builtpkgs/$pkg.tar.gz -C sysroot
    tar xf builtpkgs/$pkg.scripts.tar.gz -C sysroot
    if [ -e sysroot/x10/tree/$pkg/bin ]; then
        for f in $(ls sysroot/x10/tree/$pkg/bin); do
            ln -svr sysroot/x10/tree/$pkg/bin/$f sysroot/bin/$f
        done
    fi
    if [ -e sysroot/x10/tree/$pkg/lib64/ld-linux-x86-64.so.2 ]; then
        ln -svr sysroot/x10/tree/$pkg/lib64/ld-linux-x86-64.so.2 sysroot/lib64/ld-linux-x86-64.so.2
    fi
done
