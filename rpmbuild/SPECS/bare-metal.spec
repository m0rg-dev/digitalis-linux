Name: bare-metal
Version: 2
Release: 1%{?dist}
Summary: Packages required to boot digitalis on a real computer
License: None

BuildRequires: /usr/bin/true

Requires: e2fsprogs
Requires: eudev
Requires: grub
Requires: kbd
Requires: kernel
Requires: openrc
Requires: udev-init-scripts

%description

%prep

%build

%install

%files

%changelog

- 2020-11-05 Morgan Thomas <m@m0rg.dev>
  Added e2fsprogs and kbd to requires, version -> 2