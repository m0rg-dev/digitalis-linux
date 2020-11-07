# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

Name:           %{?cross}eudev
Version:        3.2.9
Release:        1%{?dist}
Summary:        Compatible fork of systemd-udevd

License:        GPLv2+
URL:            https://wiki.gentoo.org/wiki/Project:Eudev
%undefine       _disable_source_fetch
Source0:        https://dev.gentoo.org/~blueness/eudev/eudev-%{version}.tar.gz
%define         SHA256SUM0 89618619084a19e1451d373c43f141b469c9fd09767973d73dd268b92074d4fc
Source1:        eudev-01-initcpio-hooks
Source2:        eudev-02-initcpio-install

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif

BuildRequires:  %{?target_tool_prefix}gcc
BuildRequires:  %{?target_tool_prefix}g++
BuildRequires:  make
BuildRequires:  gperf
BuildRequires:  kmod
BuildRequires:  /usr/sbin/blkid
BuildRequires:  %{?target_tool_prefix}libblkid-devel
BuildRequires:  %{?target_tool_prefix}libkmod-devel

Requires:       openrc
Requires:       kmod
Requires:       %{?cross}libudev%{?_isa} = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n %{?cross}libudev
Summary:        Library interface to udev/eudev
License:        GPLv2+

%description -n %{?cross}libudev

%package     -n %{?cross}libudev-devel
Summary:        Development files for libudev
Requires:       %{?cross}libudev%{?_isa} = %{version}-%{release}

%description -n %{?cross}libudev-devel
The libudev-devel package contains libraries and header files for
developing applications that use libudev.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n eudev-%{version}

%build
%configure --libdir=%{_prefix}/lib --host=%{_target} --enable-manpages --disable-static
%make_build

%install
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%{buildroot}%{_bindir}/udevadm hwdb -r %{buildroot} --update
%{__install} -dm755 %{buildroot}%{_prefix}/lib/initcpio/hooks
%{__install} -dm755 %{buildroot}%{_prefix}/lib/initcpio/install
%{__install} -m644 %{SOURCE1} %{buildroot}%{_prefix}/lib/initcpio/hooks/udev
%{__install} -m644 %{SOURCE2} %{buildroot}%{_prefix}/lib/initcpio/install/udev

%files
%license COPYING
%{_bindir}/*
%{_sbindir}/*
%{_datadir}/pkgconfig/udev.pc
%{_prefix}/lib/initcpio/{hooks,install}/*
%doc %{_mandir}/man{5,7,8}/*

%files -n %{?cross}libudev
%license COPYING
%{_prefix}/lib/libudev.so.*
%{_prefix}/lib/udev
%{_sysconfdir}/udev

%files -n %{?cross}libudev-devel
%{_includedir}/*
%{_prefix}/lib/libudev.so
%{_prefix}/lib/pkgconfig/libudev.pc

%changelog
