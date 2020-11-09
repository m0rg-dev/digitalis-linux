Name:     base-system
Version:  7
Release:  1%{?dist}
Summary:  Virtual package for basic system setup
BuildArch: noarch

License:  None

Requires: fs-tree

Requires: bash
Requires: coreutils
Requires: diffutils
Requires: file
Requires: findutils
Requires: gawk
Requires: grep
Requires: gzip
Requires: iana-etc
Requires: inetutils
Requires: iproute2
Requires: less
Requires: nano
Requires: pkg-config
Requires: procps
Requires: sed
Requires: shadow
Requires: tzdata
Requires: util-linux
Requires: which

Requires: dnf
Requires: digitalis-repository

BuildRequires: /usr/bin/true

%description

%files

%changelog
- 2020-11-09 Morgan Thomas <m@m0rg.dev> 7 release 1
  Removed dhcpcd from requires (moved to bare-metal).

- 2020-11-06 Morgan Thomas <m@m0rg.dev>
  Added less to requires, version -> 6
  
- 2020-11-06 Morgan Thomas <m@m0rg.dev>
  Added nano to requires, version -> 5

- 2020-11-06 Morgan Thomas <m@m0rg.dev>
  Added iproute2, iana-etc and dhcpcd to requires, version -> 4

- 2020-11-05 Morgan Thomas <m@m0rg.dev>
  Added procps and inetutils to requires, version -> 3

- 2020-11-04 Morgan Thomas <m@m0rg.dev>
  Added util-linux to requires, version -> 2