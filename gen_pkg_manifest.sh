#!/bin/bash

set -e

NEW_MANIFEST=$(mktemp)
for pkgnam in $(cd packages; find . -type f | grep -v MANIFEST | sed 's/@.*$//;s|./||' | sort | uniq); do
    line="$pkgnam "
    for version in $(ls packages/$pkgnam@*.yml | sed 's/.*@//;s/\.yml//'); do
        line="$line $version"
    done
    echo $line >> $NEW_MANIFEST
done

mv $NEW_MANIFEST packages/MANIFEST
chmod 644 packages/MANIFEST
