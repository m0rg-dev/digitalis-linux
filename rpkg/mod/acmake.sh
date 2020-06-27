if [ -z "$COMP" ]; then
    export COMP=tar.xz
fi
if [ -z "$SRC" ]; then
    export SRC=$PACKAGE-$VERSION.$COMP
fi
if [ -z "$SRC_URL" ]; then
    export SRC_URL=$UPSTREAM/$PACKAGE/$SRC
fi
if [ -z "$UNPACK_DIR" ]; then
    export UNPACK_DIR=$PACKAGE-$VERSION
fi
if [ -z "$CONFIG_OPTS" ]; then
    export CONFIG_OPTS="--prefix=/usr"
fi

pkg_build() {
    echo "Unpacking $SRC" >&2
    case $COMP in
        tar.xz)
            tar xfJ $SRC
            ;;
        tar.gz)
            tar xfz $SRC
            ;;
        tar.bz2)
            tar xfj $SRC
            ;;
    esac
    rm $SRC
    
    if [ -n "$USE_BUILD_DIR" ]; then
        mkdir build
        cd build
        echo "Configuring in build directory" >&2
        [ -n "$PRECONFSCRIPT" ] && bash -exc "$PRECONFSCRIPT"
        [ -z "$SKIP_CONFIGURE" ] && ../$UNPACK_DIR/configure $CONFIG_OPTS
    else
        cd $UNPACK_DIR
        echo "Configuring in $UNPACK_DIR" >&2
        [ -n "$PRECONFSCRIPT" ] && bash -exc "$PRECONFSCRIPT"
        [ -z "$SKIP_CONFIGURE" ] && ./configure $CONFIG_OPTS
    fi

    if [ -n "$MAKESCRIPT" ]; then
        echo "Running custom make script" >&2
        bash -exc "$MAKESCRIPT"
    else
        echo "Running make" >&2
        make $MAKEOPTS
    fi

    [ -n "$POSTMAKESCRIPT" ] && bash -exc "$POSTMAKESCRIPT"

    if [ -n "$INSTALLSCRIPT" ]; then
        echo "Running custom install script" >&2
        bash -exc "$INSTALLSCRIPT"
    else
        echo "Running make install" >&2
        make DESTDIR=$(realpath ..) install $MAKEINSTALLOPTS
    fi

    cd ..
    [ -n "$POSTINSTALLSCRIPT" ] && bash -exc "$POSTINSTALLSCRIPT"
    echo "Cleaning up" >&2
    rm -rf $UNPACK_DIR build

    if [[ -d lib || -d usr/lib ]]; then
        echo "Running ldconfig" >&2
        ldconfig -N -r .
    fi
}