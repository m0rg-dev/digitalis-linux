Name:           bc
Version:        3.1.5
Release:        1%{?dist}
Summary:        bc is an arbitrary precision numeric processing language.

License:        BSD-2-Clause
URL:            https://git.yzena.com/gavin/bc
%undefine       _disable_source_fetch
Source0:        https://git.yzena.com/gavin/bc/archive/%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 7a407f7f0f8a3f8c5e07c8bbafacd9613b6bf38f1529d99734040c89030ea950

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  gcc
BuildRequires:  make

%undefine _annotated_build
%global debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{name}

%build
PREFIX=%{_prefix} HOSTCC=gcc CC=%{?host_tool_prefix}gcc CFLAGS="-std=c99" ./configure.sh -g -O3
%make_build

%install
DESTDIR=%{buildroot} make install

%files
%license LICENSE.md
%{_bindir}/bc
%{_bindir}/dc
%{_datadir}/locale/*/bc
%doc %{_mandir}/man1/*

%changelog
