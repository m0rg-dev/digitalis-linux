The `x10` reproducible package system
===

(This document is a work in progress. At this point it exists more to collect my thoughts than to provide comprehensive technical documentation.)

- Explicitly separate "bootstrap" build environment from the package tree. In my previous terminology that means all `x10` packages are "stage1"
  - should `x10` packages be able to build-depend other `x10` packages directly? probably
  - though this will be separate from "bootstrap environment" depends
- Packages contain their tree, a list of dependency packages specified by hash, a list of sources used to generate their bootstrap environment, and a manifest.
  - This information should be usable to generate a byte-for-byte identical copy of the package tarball.
  - Dependency packages should be deduplicated on the fs by hash and their configuration should be merged by name.
- The bootstrap environment is not transferable between hosts. It should reside in a location separate from the `x10` install tree, and packages should not reference paths within the bootstrap environment directly.
  - Creation of a bootstrap environment should not be required to install `x10` packages.


Package layout:

- hash-pkg-version.src.tar.gz
  x10/buildscripts/hash-pkg-version.sh
  x10/buildscripts/hash-dependency-version.sh+
- hash-pkg-version.tar.gz
  x10/tree/hash-pkg-version
