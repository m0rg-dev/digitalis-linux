Name:           eudev
Version:        3.2.9
Release:        1%{?dist}
Summary:        Compatible fork of systemd-udevd

License:        GPLv2+
URL:            https://wiki.gentoo.org/wiki/Project:Eudev
%undefine       _disable_source_fetch
Source0:        https://dev.gentoo.org/~blueness/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 89618619084a19e1451d373c43f141b469c9fd09767973d73dd268b92074d4fc
Source1:        eudev-01-initcpio-hooks
Source2:        eudev-02-initcpio-install

%if "%{_build}" != "%{_target}"
%error "This package is not set up for cross-compilation"
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  gperf
BuildRequires:  kmod

Requires:       openrc
Requires:       kmod
Requires:       libudev%{?_isa} = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n libudev
Summary:        Library interface to udev/eudev
License:        GPLv2+

%description -n libudev

%package     -n libudev-devel
Summary:        Development files for libudev
Requires:       libudev%{?_isa} = %{version}-%{release}

%description -n libudev-devel
The libudev-devel package contains libraries and header files for
developing applications that use libudev.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib --enable-manpages --disable-static
%make_build

%install
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%{buildroot}%{_bindir}/udevadm hwdb -r %{buildroot} --update
%{__install} -dm755 %{buildroot}%{_prefix}/lib/initcpio/hooks
%{__install} -dm755 %{buildroot}%{_prefix}/lib/initcpio/install
%{__install} -m644 %{SOURCE1} %{buildroot}%{_prefix}/lib/initcpio/hooks/
%{__install} -m644 %{SOURCE2} %{buildroot}%{_prefix}/lib/initcpio/install/

%files
%license COPYING
%{_bindir}/*
%{_sbindir}/*
%{_datadir}/pkgconfig/udev.pc
%{_prefix}/lib/initcpio/{hooks,install}/*
%doc %{_mandir}/man{5,7,8}/*

%files -n libudev
%license COPYING
%{_prefix}/lib/libudev.so.*
%{_prefix}/lib/udev
%{_sysconfdir}/udev

%files -n libudev-devel
%{_includedir}/*
%{_prefix}/lib/libudev.so
%{_prefix}/lib/pkgconfig/libudev.pc

%changelog
