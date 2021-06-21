#!/bin/bash

set -e
set -x

declare -xp
for obj in $(find $DESTDIR -type f | xargs file | grep 'dynamically linked' | cut -d: -f1); do
    objdump -p $obj | grep SONAME | awk '{print "shlib("$2")"}' >> $DESTDIR/generated-provides.in
    objdump -p $obj | grep NEEDED | awk '{print "shlib("$2")"}' >> $DESTDIR/generated-depends.in
done
