# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%global _oldprefix %{_prefix}
%define _prefix /usr/%{_target}/usr
%endif

%define libname gmp

Name:           %{?cross}lib%{libname}
Version:        6.2.1
Release:        1%{?dist}
Summary:        GMP is a free library for arbitrary precision arithmetic, operating on signed integers, rational numbers, and floating-point numbers.

License:        GPL-2.0-or-later OR LGPL-3.0-or-later
URL:            https://www.gnu.org/software/gmp/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{libname}/%{libname}-%{version}.tar.xz
%define         SHA256SUM0 fd4829912cddd12f84181c3451cc752be224643e87fac497b69edddadc49b4f2

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/gmp/"}

BuildRequires:  make m4

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

mkdir build
cd build
%define _configure ../configure
%configure --host=%{_target} --libdir=%{_prefix}/lib --disable-static CC=%{?target_tool_prefix}gcc
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'
rm -f %{buildroot}%{_infodir}/dir

%files
%license COPYING COPYING.LESSERv3 COPYINGv2 COPYINGv3
%{_prefix}/lib/*.so.*
%doc %{_infodir}/*.info*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/%{libname}.pc

%changelog

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 6.2.1-1
  Updated to version 6.2.1.

* Sat Nov 07 2020 Morgan Thomas <m@m0rg.dev> 6.2.0-3
  Remove the generated info directory (if present) before packaging.

* Sat Nov 07 2020 Morgan Thomas <m@m0rg.dev> 6.2.0-2
  Fix gcc detection when cross-compiling from Fedora.
