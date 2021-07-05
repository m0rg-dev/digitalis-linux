#!/bin/bash

set -e
set -x

test -e $DESTDIR/generated-provides.in && sort -u $DESTDIR/generated-provides.in | grep . >$DESTDIR/generated-provides && rm $DESTDIR/generated-provides.in
test -e $DESTDIR/generated-depends.in && sort -u $DESTDIR/generated-depends.in | grep . >$DESTDIR/generated-depends && rm $DESTDIR/generated-depends.in

if [ -n "$SKIP_GENERATED_DEPENDS" ]; then
    rm $DESTDIR/generated-depends
fi

true