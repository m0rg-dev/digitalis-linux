set -e
#set -x


# this needs to be way more explicitly a meta-language that generates source pkgs.

declare -A SOURCES
declare -A DEFINED_FUNCS

X10_PV_OPTS=-p

# cursed reflection stuff

_copy_definition() {
    if [ -z "${DEFINED_FUNCS[$1]}" ]; then
        test "$(type -t $1)" = "function"
        type $1 | tail -n +2
        echo ""
        DEFINED_FUNCS[$1]="1"
    fi
}

_defer() {
    _copy_definition "$1"
    echo "$@"
}

_fetch_url() {
    _x10_use_any mkdir -pv /x10/downloads/tmp
    echo " => $2"
    _x10_use_any curl -Lo /x10/downloads/tmp/$1 $2
    _x10_use_any sha256sum /x10/downloads/tmp/$1
    _x10_use_any mv /x10/downloads/tmp/$1 /x10/downloads/$(sha256sum /x10/downloads/tmp/$1 | cut -d ' ' -f 1)-$1
}

fetch-source() {
    _copy_definition _fetch_url
    _defer _fetch_source "$@"
    SOURCES[$1]="/x10/downloads/$2-$1"
}

_fetch_source() {
    local NAME=$1; shift
    local HASH=$1; shift

    echo "Fetching: $NAME"

    if [ -e /x10/downloads/$HASH-$NAME ]; then
        echo " => already downloaded"
        return
    fi

    for url in "$@"; do
        _fetch_url $NAME $url || true
        if [ -e /x10/downloads/$HASH-$NAME ]; then
            return
        fi
    done
    false
}

build-command() {
    echo "$@"
}

unpack-source() {
    build-command tar xfa $1 -C /x10/build/\$X10_PKGID
}

setup-build-dirs() {
    build-command rm -rf "/x10/build/\$X10_PKGID"
    build-command mkdir -pv "/x10/build/\$X10_PKGID"
    build-command cd "/x10/build/\$X10_PKGID"
                  unpack-source ${SOURCES[$1]}
    build-command cd ${UNPACK_DIR:-$(basename $1)}
}

_set_compiler_flags() {
    LDFLAGS=

    if [ -n "$X10_LIBRARY_PATH" ]; then
        for dir in $(echo "$X10_LIBRARY_PATH" | tr ':' ' '); do
            # only add to rpath if there are actually libraries there...
            if ls $dir | grep -q "\.so$"; then
                LDFLAGS="$LDFLAGS -Wl,-rpath,$dir -L$dir"
            fi
        done
    fi

    OPTFLAGS_FILE=$(realpath optflags.txt)
    echo "-g -O2 -pipe" >$OPTFLAGS_FILE
    HAVE_GLIBC_HEADER=""
    if [ -n "$X10_HEADER_PATH" ]; then
        for dir in $(echo "$X10_HEADER_PATH" | tr ':' ' '); do
            if [[ "$dir" == *"glibc"* ]]; then
                HAVE_GLIBC_HEADER="-isystem $dir"
            else
                echo "-isystem $dir" >>$OPTFLAGS_FILE
            fi
        done
    fi
    sort -u -o $OPTFLAGS_FILE $OPTFLAGS_FILE
    if [ -n "$HAVE_GLIBC_HEADER" ]; then
        echo "$HAVE_GLIBC_HEADER" >>$OPTFLAGS_FILE
    fi

    echo "$OPTFLAGS" >>$OPTFLAGS_FILE

    if [ -n "$X10_DYNAMIC_LINKER" ]; then
        LDFLAGS="-Wl,-z,nodefaultlib -Wl,-I,$X10_DYNAMIC_LINKER $LDFLAGS"
        # so that crtX.o can be found
        LDFLAGS="-B$(dirname $X10_DYNAMIC_LINKER | sed -e 's/lib64/lib/') $LDFLAGS"
    fi

    if [ -z "$INHIBIT_LOCAL_RPATH" ]; then
        # add our tree's libdir to rpath as well
        LDFLAGS="-Wl,-rpath,/x10/tree/$X10_PKGID/lib $LDFLAGS"
    fi


    export LDFLAGS
    export CFLAGS="@$OPTFLAGS_FILE"
    export CXXFLAGS="@$OPTFLAGS_FILE"
}

# TODO fix instances where this was called as build-autoconf "sourceid"
build-autoconf() {
    if [ -n "$PATCH_CMD" ]; then
        build-command "$PATCH_CMD"
    fi

    build-command mkdir -pv build
    build-command cd build

    if [ -z "$USED_COMPILER_WRAPPER" ]; then
        _defer _set_compiler_flags
    fi

    build-command ${CONFIGURE:-../configure} --prefix=$(x10-tree) --libdir=$(x10-tree)/lib "$CONFIGURE_FLAGS" "$@"
    build-command make V=1 ${MAKE_JOBS:--j'$(nproc)'}
    build-command make DESTDIR="\$DESTDIR" install
}

# TODO deprecated
use-libtool-gcc-wrapper() {
    _defer _set_compiler_flags
    build-command echo -e '"#!/bin/sh\n$X10_TARGET-gcc "$LDFLAGS" \"\$@\""' '>' gccwrap
    build-command chmod +x gccwrap
    build-command export CC='$(realpath gccwrap)'
    build-command echo -e '"#!/bin/sh\n$X10_TARGET-g++ "$LDFLAGS" \"\$@\""' '>' g++wrap
    build-command chmod +x g++wrap
    build-command export CXX='$(realpath g++wrap)'
}

use-libtool-g++-wrapper() {
    # TODO "emit-warning"
    true;
}

use-compiler-wrapper() {
    _defer _set_compiler_flags
    if [ -n "$CROSS" ]; then
        local CC=$X10_TARGET-gcc
        local CXX=$X10_TARGET-g++
    else
        local CC=gcc
        local CXX=g++
    fi
    build-command echo -e '"#!/bin/sh\n'$CC' "$CFLAGS" "$LDFLAGS" \"\$@\""' '>' gccwrap
    build-command chmod +x gccwrap
    build-command export CC='$(realpath gccwrap)'
    build-command echo -e '"#!/bin/sh\n'$CXX' "$CXXFLAGS" "$LDFLAGS" \"\$@\""' '>' g++wrap
    build-command chmod +x g++wrap
    build-command export CXX='$(realpath g++wrap)'

    if [ -z "$KEEP_FLAGS" ]; then
        build-command unset CFLAGS
        build-command unset CXXFLAGS
        build-command unset LDFLAGS
    fi

    USED_COMPILER_WRAPPER=1
}

x10-tree() {
    echo "/x10/tree/\${X10_PKGID}"
}

_x10_hash_usecache() {
    if [ -e /tmp/x10_cache/hash-$(basename $1) ]; then
        cat /tmp/x10_cache/hash-$(basename $1)
    else
        $X10 $1 hash
    fi
}

x10-import() {
    _copy_definition _deduplicate_search_path
    _copy_definition _import_recurse
    local HASH=$(_x10_hash_usecache $(realpath $1))
    _defer _do_import $HASH
    X10_IMPORTED="$(realpath $1) $X10_IMPORTED"
    build-command "# MAGIC-COMMENT import:$HASH"
}

# for explicit runtime deps
x10-import-always() {
    local HASH=$(_x10_hash_usecache $(realpath $1))
    x10-import "$1"
    build-command echo "$HASH" '>>' /tmp/$(x10-tree)/import-keep
}

x10-hash-of() {
    _x10_hash_usecache $(realpath $1)
}

_deduplicate_search_path() {
    _x10_use_any perl -pe 'chomp;$_=join ":", grep { length($_) && !$s{$_}++ } split /:/'
}

_import_recurse() {
    if _x10_use_any grep -qF "$1" /tmp/x10-import-$X10_PKGID; then
        # we already did this.
        return
    fi

    for dep in $(_x10_use_any grep 'MAGIC-COM''MENT import' /x10/buildscripts/$1.sh | _x10_use_any cut -d':' -f2); do
        _import_recurse $dep
    done

    echo "$1" >> /tmp/x10-import-$X10_PKGID
}

_do_import() {
    if [ ! -e /x10/tree/$1/file-list ]; then
        if [ -e /x10/buildscripts/$1.sh ]; then
            _x10_use_any sh -$- /x10/buildscripts/$1.sh
        else
            # this shouldn't happen
            echo "Need /x10/buildscripts/$1.sh but not provided"
            false
        fi
    fi

    echo "Importing: $1"

    _import_recurse "$1"

    for dep in $(_x10_use_any cat /tmp/x10-import-$X10_PKGID); do
        set +e
        test -e /x10/tree/$dep/bin && export X10_BINARY_PATH=/x10/tree/$dep/bin:$X10_BINARY_PATH
        test -e /x10/tree/$dep/lib && export X10_LIBRARY_PATH=/x10/tree/$dep/lib:$X10_LIBRARY_PATH
        test -e /x10/tree/$dep/include && export X10_HEADER_PATH=/x10/tree/$dep/include:$X10_HEADER_PATH
        test -e /x10/tree/$dep/include/$X10_TARGET && export X10_HEADER_PATH=/x10/tree/$dep/include/$X10_TARGET:$X10_HEADER_PATH
        test -e /x10/tree/$dep/lib64/ld-linux-x86-64.so.2 && export X10_DYNAMIC_LINKER=/x10/tree/$dep/lib64/ld-linux-x86-64.so.2
        test -e /x10/tree/$dep/share/aclocal && export X10_ACLOCAL_PATH=/x10/tree/$dep/share/aclocal:$X10_ACLOCAL_PATH
        test -e /x10/tree/$dep/lib/pkgconfig && export X10_PKGCONF_PATH=/x10/tree/$dep/lib/pkgconfig:$X10_PKGCONF_PATH
        
        set -e
    done

    # clean up duplicates
    export X10_LIBRARY_PATH=$(echo "$X10_LIBRARY_PATH" | _deduplicate_search_path)
    export X10_HEADER_PATH=$(echo "$X10_HEADER_PATH" | _deduplicate_search_path)
    export ACLOCAL_PATH=$(echo "$X10_ACLOCAL_PATH" | _deduplicate_search_path)
    export PKG_CONFIG_PATH=$(echo "$X10_PKGCONF_PATH" | _deduplicate_search_path)
    export PATH=$(echo "$X10_BINARY_PATH:$PATH" | _deduplicate_search_path)

    echo "\$PATH is now $PATH."
    echo "Shared libraries are coming from $X10_LIBRARY_PATH."
    echo "C/C++ header files are coming from $X10_HEADER_PATH."
    echo "Autoconf .m4 files are coming from $ACLOCAL_PATH."
    echo "pkg-config definition files are coming from $PKG_CONFIG_PATH."
}

fix-shebangs() {
    _defer _fix_shebangs /tmp/$(x10-tree) $1
}

_fix_shebangs() {
    local TREE=$1; shift
    local SRCPKG=$1; shift
    local PATH=$(bash -ce 'source /tmp/x10_env; echo $PATH')
    find $TREE -type f | file -Nf - >$TREE/file-list
    for script in $(grep 'ASCII text executable' $TREE/file-list | cut -d: -f1); do
        head -n1 $script | grep -q '^#!' || continue
        local ORIG_INTERP=$(head -n1 $script | sed -e 's/#![[:space:]]*\([^[:space:]]*\).*$/\1/')
        if [ -e /x10/tree/$SRCPKG/$ORIG_INTERP -o -e /tmp/x10/tree/$SRCPKG/$ORIG_INTERP ]; then
            echo "$script: $ORIG_INTERP => /x10/tree/$SRCPKG/$ORIG_INTERP" >&2
            sed -e "1s@$ORIG_INTERP@/x10/tree/$SRCPKG/$ORIG_INTERP@" -i $script
        fi
    done
}

_import_filter() {
    TREE=$1
    shift

    #### make sure $PATH is reasonable
    local PATH=$(bash -ce 'source /tmp/x10_env; echo $PATH')
    local IMPORT_FILTER_HAD_ERRORS=""

    echo " => Previous import-keep list:" >&2
    cat $TREE/import-keep >&2

    find $TREE -type f | file -Nf - >$TREE/file-list

    #### search for shared libraries
    for so in $(grep 'ELF 64-bit LSB \(executable\|shared object\), x86-64, version 1 (SYSV), dynamically linked' $TREE/file-list | cut -d: -f1); do
        ldd $so | grep -q 'statically linked' && continue
        if ldd $so | grep -q 'not found'; then
            echo "$so has unresolved libraries!" >&2
            IMPORT_FILTER_HAD_ERROR=1
        fi

        local PKG=$(ldd $so | grep -v -e 'linux-vdso.so.1' -e 'ld-linux-x86-64' | cut -d'>' -f2 | cut -d' ' -f2 | grep -o '/x10/tree/[^/]*' | xargs -rL1 basename | sort -u)
        if [ -n "$PKG" ]; then
            echo "  => Keeping: $PKG (shlib $so)" >&2
            echo "$PKG" >>$TREE/import-keep
        else
            if [ -z "$X10_PERMIT_EXTERNAL_LIBS" ]; then
                echo "$so references libraries outside of /x10!" >&2
                IMPORT_FILTER_HAD_ERRORS=1
            fi
        fi
    done

    #### search for shebangs
    for script in $(grep 'ASCII text executable' $TREE/file-list | cut -d: -f1); do
        head -n1 $script | grep -q '^#!' || continue
        head -n1 $script | grep -q '/usr/bin/env' && continue
        local PKG=$(head -n1 $script | sed -e 's/#![[:space:]]*\([^[:space:]]*\).*$/\1/' | grep -o '/x10/tree/[^/]*' | xargs -rL1 basename)
        if [ -n "$PKG" ]; then
            echo "  => Keeping: $PKG (shebang $script)" >&2
            echo "$PKG" >>$TREE/import-keep
        else
            if [ -z "$X10_PERMIT_EXTERNAL_INTERP" ]; then
                echo "$script references an interpreter outside of /x10!" >&2
                IMPORT_FILTER_HAD_ERRORS=1
            fi
        fi
    done

    test -z "$IMPORT_FILTER_HAD_ERRORS"

    for import in $(sort -u $TREE/import); do
        if grep -F "$import" $TREE/import-keep; then
            echo $import
        fi
    done
}

_bailout() {
    if [[ "$-" == *"e"* ]]; then
        echo "Something bad happened. Dropping you to a shell..."
        _x10_use_any bash
        exit 1
    fi
}

_x10_use_any() {
    local COMMAND="$1"
    shift
    if command -v $COMMAND >/dev/null; then
        $COMMAND "$@"
    else
        $($BASH -c "source /tmp/x10_env; which $COMMAND") "$@"
    fi
}

_set_timestamps() {
    for f in $(_x10_use_any find /x10/tree/$X10_PKGID); do
        _x10_use_any touch -d @$SOURCE_DATE_EPOCH $f
    done
}

_generate() {
    # sanity check....
    if export -p | grep -q INHERIT_ENVIRONMENT; then
        echo "$PACKAGE just leaked \$INHERIT_ENVIRONMENT, stopping you from having a bad time" >&2
        exit 1
    fi

    echo "=> generate $PACKAGE" >&2

    echo -e "# This script generates $PACKAGE-$VERSION.\n"
    echo -e "set -e\nset -o pipefail\n"
    _copy_definition _x10_use_any
    if [[ -z $INHERIT_ENVIRONMENT ]]; then
        build-command '[ "$(_x10_use_any env | _x10_use_any sed -r -e '\''/^(PWD|SHLVL|_)=/d'\'')" ] && exec -c /bin/sh -$- $0'
        build-command 'export PATH='
    else
        # get our environment back, if necessary
        build-command source /tmp/x10_env
    fi
    echo -e "export X10_PKGID=\$(_x10_use_any sha256sum \$BASH_SOURCE | _x10_use_any head -c7)-$PACKAGE-$VERSION"
    build-command _x10_use_any touch /tmp/x10-import-\$X10_PKGID
    build-command unset X10_IMPORT_KEEP
    build-command unset X10_IMPORTED
    # TODO we should only have to do this once
    export X10_TARGET=x86_64-x10-linux-gnu
    build-command export X10_TARGET=x86_64-x10-linux-gnu
    build-command export X10_PERMIT_EXTERNAL_LIBS="$X10_PERMIT_EXTERNAL_LIBS"
    build-command export X10_PERMIT_EXTERNAL_INTERP="$X10_PERMIT_EXTERNAL_INTERP"
    _copy_definition _bailout
    build-command trap '_bailout' ERR
    # some reproducible-builds housekeeping.
    build-command export LC_ALL=C
    build-command export TZ=UTC
    build-command export SOURCE_DATE_EPOCH=$($X10 $X10_CURRENT_SRC _source_date_epoch)
    echo ""
    
    build-command _x10_use_any rm -rf /tmp/$(x10-tree) 
    build-command _x10_use_any mkdir -p /tmp/$(x10-tree) 
    build-command export DESTDIR=/tmp

    x10-generate
    build-command mv --backup -T /tmp/$(x10-tree) $(x10-tree)
    build-command rm -rf $(x10-tree)~

    # imports
    build-command _x10_use_any mv /tmp/x10-import-\$X10_PKGID $(x10-tree)/import
    build-command _x10_use_any touch $(x10-tree)/import-keep
    _defer _import_filter $(x10-tree) '|' sort -u '>' $(x10-tree)/import-tmp
    build-command _x10_use_any mv $(x10-tree)/import{-tmp,}

    _defer _set_timestamps

    build-command _x10_use_any rm -rf /x10/build/\$X10_PKGID
}

export X10_PV=$(which pv)
trap 'jobs -p | xargs -r kill' EXIT
