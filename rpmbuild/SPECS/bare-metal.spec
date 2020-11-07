Name: bare-metal
Version: 4
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
Requires: sudo
Requires: udev-init-scripts

%description

%prep

%build

%install

%files

%changelog

- 2020-11-07 Morgan Thomas <m@m0rg.dev> 4 release 1
  Added sudo to requires (here instead of base-system beacuse you don't need
  sudo in a container).

- 2020-11-05 Morgan Thomas <m@m0rg.dev> 3 release 1
  Added e2fsprogs and kbd to requires.