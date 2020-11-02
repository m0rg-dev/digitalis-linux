Name:     base-system
Version:  1
Release:  1%{?dist}
Summary:  Virtual package for basic system setup
BuildArch: noarch

License:  None

Requires: fs-tree

Requires: bash
Requires: coreutils
Requires: sed
Requires: grep
Requires: gawk
Requires: gzip
Requires: findutils
Requires: file
Requires: diffutils
Requires: pkg-config
Requires: which

Requires: dnf
Requires: digitalis-repository

BuildRequires: /usr/bin/true

%description

%files

%changelog
