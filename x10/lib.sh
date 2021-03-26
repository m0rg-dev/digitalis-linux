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
    mkdir -pv /x10/downloads/tmp
    echo " => $2"
    curl -Lo /x10/downloads/tmp/$1 $2
    sha256sum /x10/downloads/tmp/$1
    mv /x10/downloads/tmp/$1 /x10/downloads/$(sha256sum /x10/downloads/tmp/$1 | cut -d ' ' -f 1)-$1
}

fetch-source() {
    _copy_definition _fetch_url
    _defer _fetch_source "$@"
    SOURCES[$1]="/x10/downloads/$2-$1"
}

_fetch_source() {
    local NAME=$1; shift
    local HASH=$1; shift

    # SOURCES[$NAME]="$HASH-$NAME"
    # if [ -n "$X10_FETCH_DRYRUN" ]; then
    #     true
    #     return
    # fi

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
    progress-name "$(basename $1):unpack"
    build-command tar xfa $1 -C /x10/build/\$X10_PKGID
}

setup-build-dirs() {
    build-command rm -rf "/x10/build/\$X10_PKGID"
    build-command rm -rf "/x10/tree/\$X10_PKGID"
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
                LDFLAGS="-Wl,-rpath,$dir -L$dir $LDFLAGS"
            fi
        done
    fi

    OPTFLAGS_FILE=$(realpath optflags.txt)
    echo "-O2 -pipe" >$OPTFLAGS_FILE
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

    export LDFLAGS
    export CFLAGS="@$OPTFLAGS_FILE"
    export CXXFLAGS="@$OPTFLAGS_FILE"
}

build-autoconf() {
    if [ -n "$PATCH_CMD" ]; then
        build-command "$PATCH_CMD"
    fi

    build-command mkdir -pv build
    build-command cd build

    _defer _set_compiler_flags

    # build-command 'export LDFLAGS='
    # build-command 'test -n "$X10_LIBRARY_PATH" && export LDFLAGS="-Wl,-z,nodefaultlib $(echo "$X10_LIBRARY_PATH" | perl -pe "chomp;@c=split/:/;\$_=join q( ), map{qq(-Wl,-rpath,\$_)}grep{length}@c")"'
    # build-command 'export CFLAGS='
    # build-command 'test -n "$X10_HEADER_PATH" && export CFLAGS="$(echo "$X10_HEADER_PATH" | perl -pe "chomp;@c=split/:/;\$_=join q( ), map{qq(-isystem \$_)}grep{length}@c")"'

    # build-command 'export CFLAGS="-O2 -pipe $CFLAGS"'
    # build-command 'export CXXFLAGS="$CFLAGS"'

    # build-command 'test -n "$X10_DYNAMIC_LINKER" && export LDFLAGS="-Wl,-I,$X10_DYNAMIC_LINKER $LDFLAGS"'

    progress-name "$PACKAGE:configure"
    build-command ${CONFIGURE:-../configure} --prefix=$(x10-tree) --libdir=$(x10-tree)/lib "$CONFIGURE_FLAGS" "$@" #LDFLAGS=\"\$LDFLAGS\"
    progress-name "$PACKAGE:make"
    build-command make V=1 ${MAKE_JOBS:--j'$(nproc)'}
    progress-name "$PACKAGE:install"
    if [ -n "$DESTDIR" ]; then
        build-command make DESTDIR="$DESTDIR" install
    else
        build-command make install
    fi
}

# TODO these could be the same thing
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


# do-package() {
#     mkdir -pv /x10/logs/
#     echo "Building ${1:-$X10_PKGID} - build output going to /x10/logs/${1:-$X10_PKGID}.log"
#     rm -f /x10/logs/${1:-$X10_PKGID}.log
#     sh -ex /x10/buildscripts/${1:-$X10_PKGID}.sh >/x10/logs/${1:-$X10_PKGID}.log 2>&1 &
#     local PID=$!
#     if [ -n "$X10_VERBOSE" ]; then
#         tail -qF /x10/logs/${1:-$X10_PKGID}.log --pid=$PID
#     elif [ -n "$X10_PV" -a -n "$X10_BUILD_LOG_SIZE" ]; then
#         tail -qF /x10/logs/${1:-$X10_PKGID}.log --pid=$PID | pv $X10_PV_OPTS -s $X10_BUILD_LOG_SIZE >/dev/null -P /tmp/x10_pv.pid
#     fi
#     wait $PID
# }

progress-name() {
    build-command ""
    build-command "# Progress step: $1"
    build-command "if [ -e /tmp/x10_pv.pid ]; then pv $X10_PV_OPTS -R \$(cat /tmp/x10_pv.pid) -N '$1'; else echo '[$1]' >/dev/tty; fi"
}

setup() {
    mkdir -pv "/x10/buildscripts"
#    rm -f /x10/buildscripts/$X10_PKGID.sh
    # echo ">> /x10/buildscripts/$X10_PKGID.sh" >&2
    if [[ -z $INHERIT_ENVIRONMENT ]]; then
        build-command '[ "$(env | /bin/sed  -r -e '\''/^(PWD|SHLVL|_)=/d'\'')" ] && exec -c bash -ex $0'
        build-command 'PATH='
    fi
    # some reproducible-builds housekeeping.
    build-command export LC_ALL=C
    build-command export TZ=UTC
    build-command export SOURCE_DATE_EPOCH=$(date +%s)
}

x10-tree() {
    echo "/x10/tree/\$X10_PKGID"
}

x10-import() {
    _copy_definition _deduplicate_search_path
    _copy_definition _import_recurse
    _defer _do_import $($X10 $(realpath $1) hash)
    X10_IMPORTED="$(realpath $1) $X10_IMPORTED"
    build-command "# MAGIC-COMMENT import:$($X10 $1 hash)"
}

_deduplicate_search_path() {
    _x10_use_any perl -pe 'chomp;$_=join ":", grep { length($_) && !$s{$_}++ } split /:/'
}

_import_recurse() {
    if _x10_use_any fgrep -q "$1" /tmp/x10-import-$X10_PKGID; then
        # we already did this.
        return
    fi

    for dep in $(_x10_use_any grep 'MAGIC-COM''MENT import' /x10/buildscripts/$1.sh | _x10_use_any cut -d':' -f2); do
        _import_recurse $dep
    done

    echo "$1" >> /tmp/x10-import-$X10_PKGID
}

_do_import() {
    if [ ! -e /x10/tree/$1 ]; then
        if [ -e /x10/buildscripts/$1.sh ]; then
            _x10_use_any sh -ex /x10/buildscripts/$1.sh
        else
            # this shouldn't happen
            echo "Need /x10/buildscripts/$1.sh but not provided"
            false
        fi
    fi

    echo "Importing: $1"
    _x10_use_any touch /tmp/x10-import-$X10_PKGID

    _import_recurse "$1"
    _x10_use_any cat /tmp/x10-import-$X10_PKGID

    for dep in $(_x10_use_any cat /tmp/x10-import-$X10_PKGID); do
        set +e
        test -e /x10/tree/$dep/bin && export X10_BINARY_PATH=/x10/tree/$dep/bin:$X10_BINARY_PATH
        test -e /x10/tree/$dep/lib && export X10_LIBRARY_PATH=/x10/tree/$dep/lib:$X10_LIBRARY_PATH
        # test -e /x10/tree/$dep/lib64 && export X10_LIBRARY_PATH=/x10/tree/$dep/lib64:$X10_LIBRARY_PATH
        test -e /x10/tree/$dep/include && export X10_HEADER_PATH=/x10/tree/$dep/include:$X10_HEADER_PATH
        test -e /x10/tree/$dep/include/$X10_TARGET && export X10_HEADER_PATH=/x10/tree/$dep/include/$X10_TARGET:$X10_HEADER_PATH
        test -e /x10/tree/$dep/lib64/ld-linux-x86-64.so.2 && export X10_DYNAMIC_LINKER=/x10/tree/$dep/lib64/ld-linux-x86-64.so.2
        set -e
    done

    # clean up duplicates
    export X10_LIBRARY_PATH=$(echo "$X10_LIBRARY_PATH" | _deduplicate_search_path)
    export X10_HEADER_PATH=$(echo "$X10_HEADER_PATH" | _deduplicate_search_path)
    export PATH=$(echo "$X10_BINARY_PATH:$PATH" | _deduplicate_search_path)

    echo "PATH is now $PATH."
    _x10_use_any rm /tmp/x10-import-$X10_PKGID
}

# x10-pkgid() {
#     echo $(sha256sum $(echo ${BASH_SOURCE[@]} | tr " " "\n" | sort | uniq) | sha256sum | cut -d' ' -f1 | head -c7)-${1:-$PACKAGE}-$VERSION
# }

_bailout() {
    if [[ "$-" == *"e"* ]]; then
        echo "Something bad happened. Dropping you to a shell..."
        _x10_use_any bash
        false
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

_generate() {
    echo -e "# This script generates $PACKAGE-$VERSION.\n"
    echo -e "set -e"
    echo -e "set -x\n"
    if [[ -z $INHERIT_ENVIRONMENT ]]; then
        build-command '[ "$(env | /bin/sed  -r -e '\''/^(PWD|SHLVL|_)=/d'\'')" ] && exec -c sh -ex $0'
        build-command 'export PATH='
    else
        # get our environment back, if necessary
        build-command source /tmp/x10_env
    fi
    _copy_definition _x10_use_any
    echo -e "export X10_PKGID=\$(_x10_use_any sha256sum \$BASH_SOURCE | _x10_use_any head -c7)-$PACKAGE-$VERSION"
    build-command unset X10_IMPORTED
    # TODO we should only have to do this once
    export X10_TARGET=x86_64-x10-linux-gnu
    build-command export X10_TARGET=x86_64-x10-linux-gnu
    _copy_definition _bailout
    build-command trap '_bailout' ERR
    # some reproducible-builds housekeeping.
    build-command export LC_ALL=C
    build-command export TZ=UTC
    build-command export SOURCE_DATE_EPOCH=$(git log -1 --pretty=%ct $X10_CURRENT_SRC)
    echo ""

    # debug time
    build-command /usr/bin/env

    x10-generate
}

export X10_PV=$(which pv)
trap 'jobs -p | xargs -r kill' EXIT

# x10-run() {
#     if [ "$1" = "fetch" ]; then
#         x10-fetch
#     elif [ "$1" = "generate" ]; then
#         X10_FETCH_DRYRUN=1 x10-fetch
#         x10-generate
#     elif [ "$1" = "package" ]; then
#         X10_FETCH_DRYRUN=1 x10-fetch
#         test -e /x10/buildscripts/$X10_PKGID.sh || x10-generate
#         x10-package
#     elif [ "$1" = "hash" ]; then
#         echo $X10_PKGID
#     fi
# }
