#!/bin/bash

set -e
set -x

test -e $DESTDIR/generated-provides.in && sort -u $DESTDIR/generated-provides.in >$DESTDIR/generated-provides && rm $DESTDIR/generated-provides.in
test -e $DESTDIR/generated-depends.in && sort -u $DESTDIR/generated-depends.in >$DESTDIR/generated-depends && rm $DESTDIR/generated-depends.in

true