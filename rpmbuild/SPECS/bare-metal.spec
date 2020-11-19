Name: bare-metal
Version: 5
Release: 1%{?dist}
Summary: Packages required to boot digitalis on a real computer
License: None

# X10-Update-Spec: { "type": "none" }

BuildRequires: /usr/bin/true

Requires: dhcpcd
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

* Mon Nov 09 2020 Morgan Thomas <m@m0rg.dev> 5-1
  Added dhcpcd to requires (moved from base-system).

* Sat Nov 07 2020 Morgan Thomas <m@m0rg.dev> 4-1
  Added sudo to requires (here instead of base-system beacuse you don't need
  sudo in a container).

* Thu Nov 05 2020 Morgan Thomas <m@m0rg.dev> 3-1
  Added e2fsprogs and kbd to requires.