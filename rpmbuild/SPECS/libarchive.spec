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

%define libname libarchive

Name:           %{?cross}%{libname}
Version:        3.4.3
Release:        1%{?dist}
Summary:        The libarchive project develops a portable, efficient C library that can read and write streaming archives in a variety of formats.

License:        BSD-2-Clause
URL:            https://www.libarchive.org/
%undefine       _disable_source_fetch
Source0:        http://www.libarchive.org/downloads/%{libname}-%{version}.tar.xz
%define         SHA256SUM0 0bfc3fd40491768a88af8d9b86bf04a9e95b6d41a94f9292dbc0ec342288c05f

BuildRequires:  make

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}glibc-devel

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package     -n %{?cross}archive
Summary:        Programs from libarchive(3) - bsdtar, mostly

%description -n %{?cross}archive

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build
%configure --host=%{_target} --libdir=%{_prefix}/lib --disable-static
%make_build

%install
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%doc %{_mandir}/man{3,5}/*

%files -n %{?cross}archive
%{_bindir}/bsd{cat,cpio,tar}
%doc %{_mandir}/man1/*

%changelog

