Name:           gdb
Version:        10.1
Release:        1%{?dist}
Summary:        The GNU Project Debugger

License:        GPLv2+, LGPLv2+, GPLv3+, LGPLv3+
URL:            https://gnu.org/software/gdb
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 f82f1eceeec14a3afa2de8d9b0d3c91d5a3820e23e0a01bbb70ef9f0276b62c0

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/gdb/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}g++
BuildRequires:  gcc
BuildRequires:  make
BuildRequires:  texinfo

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib
%make_build

%install
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'
find %{buildroot} -name '*.a' -exec rm -f {} ';'
rm -f %{buildroot}%{_infodir}/dir

%files
# TODO this sucks
%license COPYING COPYING3 COPYING.LIB COPYING3.LIB
%{_bindir}/*
%{_datadir}/gdb
%{_prefix}/lib/libinproctrace.so
%exclude %{_datadir}/locale
%exclude %{_includedir}
%doc %{_infodir}/*.info*
%doc %{_mandir}/man{1,5}/*

%changelog
