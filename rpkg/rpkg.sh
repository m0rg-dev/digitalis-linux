#!/usr/bin/env bash

declare -A selected

PKGDIR="/var/db/rpkg/packages/"

get_pkg_source() {
    local specifier=$1

    local single_version=$(expr "$specifier" : '.*@\(.*\)')
    local ge_version=$(expr "$specifier" : '.*>=\(.*\)')
    local pkgname=$(expr "$specifier" : '\(.*\)[@>]')

    if [ -n "$single_version" ]; then
        find $PKGDIR | grep "$specifier"
    elif [ -n "$ge_version" ]; then
        local cand_file=$(find $PKGDIR | grep "$pkgname" | sort | tail -n1 )
        local cand=$(file_to_pkgname $cand_file)
        if [[ "$cand" > "${specifier/>=/@}" ]] || [[ "${specifier/>=/@}" = "$cand" ]]; then
            echo $cand_file
        fi
    else
        find $PKGDIR | grep "$specifier"@ | sort | tail -n1
    fi
}

file_to_pkgname() {
    local file=$1
    file=${file#$PKGDIR}
    file=${file%.sh}
    echo $file
}

pkgname_to_key() {
    local pkgname=$1
    pkgname=${pkgname//[\/-]/_}
    pkgname=$(expr "$pkgname" : '\(.*\)[@>]')
    echo $pkgname
}

get_bdeps() {
    local pkgsrc=$(get_pkg_source $1)
    if [ -e "$pkgsrc" ]; then
        local pkgdepends=$(bash -c "source $pkgsrc; echo \$BDEPEND")
        echo $pkgdepends
    else
        echo "Couldn't find source for $1 in $PKGDIR" >/dev/stderr
    fi
}

get_rdeps() {
    local pkgsrc=$(get_pkg_source $1)
    if [ -e "$pkgsrc" ]; then
        local pkgdepends=$(bash -c "source $pkgsrc; echo \$RDEPEND")
        echo $pkgdepends
    else
        echo "Couldn't find source for $1 in $PKGDIR" >/dev/stderr
    fi  
}

get_depends() {
    echo $(get_bdeps $1) $(get_rdeps $1)
}

select_depends() {
    if [ -n "${selected[$1]}" ]; then
        echo "skipping already-selected package $1"
        return 0
    fi

    echo "Selecting: $1"
    selected[$1]=""
    resolve_depends
}

resolve_depends() {
    for k in "${!selected[@]}"; do
        if [ -z "${selected[$k]}" ]; then
            selected[$k]=$(get_pkg_source $k)
            echo "Dependencies for $k: " $(get_depends $k)
            for depend in $(get_depends $k); do
                echo "Adding dependency for $k: $depend"
                select_depends $depend
            done
        fi
    done
}

depends_remaining() {
    for k in "${!selected[@]}"; do
        if [ -z "${selected[$k]}"]; then
            return 1
        fi
    done
    return 0
}

output_makefile() {
    local top_key=$(pkgname_to_key $(file_to_pkgname ${selected[$1]}))
    echo "all: fetch install-$top_key"
    local fetch_files=""

    local files=""
    # due to how dependency res works we may end up with multiple keys (i.e. pkg>=1.0, pkg>=2.0)
    # that resolved to the same actual package file. let's fix that up here.
    files=$(for k in "${!selected[@]}"; do echo ${selected[$k]}; done | sort | uniq)

    echo "Files: $files" > /dev/stderr

    for pkgfile in $files; do
        local pkgkey=$(pkgname_to_key $(file_to_pkgname $pkgfile))
        local processed_bdeps=""

        for depend in $(get_bdeps $pkgfile); do
            processed_bdeps="$processed_bdeps install-$(pkgname_to_key $depend)"
        done

        local processed_rdeps=""

        for depend in $(get_rdeps $pkgfile); do
            processed_rdeps="$processed_rdeps install-$(pkgname_to_key $depend)"
        done

        if [ -e "$PKGDIR/../built/$pkgkey.tar.xz" ]; then
            # This package has been prebuilt. We can simply unpack it.
            echo "$PKGDIR/../installed/$pkgkey: $processed_rdeps"
            echo -e "\t@echo [-------- Unpacking prebuilt $pkgkey --------]"
            echo -e "\tcd /; tar xpJf $PKGDIR/../built/$pkgkey.tar.xz"
            echo -e "\ttouch $PKGDIR/../installed/$pkgkey"
        else
            local has_artifacts=0

            local dist_src=$(bash -c "source '$pkgfile'; echo \$SRC")
            if [ -n "$dist_src" ]; then
                fetch_files="$fetch_files $PKGDIR/../distfiles/$dist_src"
            fi

            if [ "$(bash -c "source '$pkgfile'; type -t pkg_build")" = 'function' ]; then
                echo "$PKGDIR/../built/$pkgkey.tar.xz: $processed_bdeps"
                echo -e "\t@echo [-------- Building $pkgkey --------]"
                echo -e "\trm -rf /tmp/build-$pkgkey; mkdir -p /tmp/build-$pkgkey"
                if [ -n "$dist_src" ]; then
                    echo -e "\tcp $PKGDIR/../distfiles/$dist_src /tmp/build-$pkgkey/"
                fi
                echo -e "\t+bash -c 'source $pkgfile; cd /tmp/build-$pkgkey; set -ex; pkg_build'"
                echo -e "\tcd /tmp/build-$pkgkey; tar cpJf $PKGDIR/../built/$pkgkey.tar.xz ."
                echo
                processed_rdeps="$processed_rdeps $PKGDIR/../built/$pkgkey.tar.xz"
                has_artifacts=1
            fi

            echo "$PKGDIR/../installed/$pkgkey: $processed_rdeps"
            if [ $has_artifacts -ge 1 ]; then
                echo -e "\t@echo [-------- Unpacking $pkgkey --------]"
                echo -e "\tcd /; tar xpJf $PKGDIR/../built/$pkgkey.tar.xz"
            fi
            echo -e "\ttouch $PKGDIR/../installed/$pkgkey"
        fi
        echo
        echo "install-$pkgkey: $PKGDIR/../installed/$pkgkey"
        echo ".PHONY: install-$pkgkey"
        echo
    done

    echo "fetch: $fetch_files"
}

debug_selected() {
    for k in "${!selected[@]}"; do
        echo "$k" '=>' ${selected[$k]}
    done
}

PARAMS=""

while (( "$#" )); do
    case "$1" in
        --pkgdir=*)
            arg=$1
            PKGDIR=$(expr "$arg" : '.*=\(.*\)')
            echo "Set PKGDIR=$PKGDIR $arg"
            shift
            ;;
        -*|--*=)
            echo "unknown argument: $1"
            exit 1
            ;;
        *)
            PARAMS="$PARAMS $1"
            shift
            ;;
    esac
done

eval set -- "$PARAMS"

case "$1" in
    get-depends)
        if [ -z "$2" ]; then
            echo "missing parameter for get-depends"
            exit 1
        fi
        select_depends $2
        debug_selected
        ;;
    makefile)
        if [ -z "$2" ]; then
            echo "missing parameter for makefile"
            exit 1
        fi
        select_depends $2
        debug_selected
        output_makefile $2 > Makefile
        ;;
    *)
        echo "unknown command $1"
        exit 1
        ;;
esac