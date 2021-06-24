#!/bin/bash

set -e
set -x

declare -xp
for obj in $(find -L $DESTDIR -type f | xargs file -L | grep 'dynamically linked' | cut -d: -f1); do
    case $obj in
        *.so*)
            basename $obj | awk '{print "shlib("$1")"}' >> $DESTDIR/generated-provides.in
    esac
    objdump -p $obj | grep NEEDED | awk '{print "shlib("$2")"}' >> $DESTDIR/generated-depends.in
done
