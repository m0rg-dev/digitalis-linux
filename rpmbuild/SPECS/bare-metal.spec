Name: bare-metal
Version: 1
Release: 1%{?dist}
Summary: Packages required to boot digitalis on a real computer
License: None

BuildRequires: /usr/bin/true

Requires: openrc
Requires: grub
Requires: eudev
Requires: udev-init-scripts
Requires: kernel

%description

%prep

%build

%install

%files

%changelog