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

%define libname cppunit

Name:           %{?cross}lib%{libname}
Version:        1.15.1
Release:        1%{?dist}
Summary:        CppUnit is the C++ port of the famous JUnit framework for unit testing.

License:        LGPLv2
URL:            https://www.freedesktop.org/wiki/Software/cppunit/
%undefine       _disable_source_fetch
Source0:        http://dev-www.libreoffice.org/src/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 89c5c6665337f56fd2db36bc3805a5619709d51fb136e51937072f63fcc717a7

# X10-Update-Spec: { "type": "webscrape", "url": "https://www.freedesktop.org/wiki/Software/cppunit/"}

BuildRequires:  make

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc
BuildRequires: %{?target_tool_prefix}g++

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
%configure --host=%{_target} --libdir=%{_prefix}/lib --disable-static
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%exclude %{_bindir}/*
%{_prefix}/lib/*.so.*
%doc %{_datadir}/doc/%{libname}

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc

%changelog

