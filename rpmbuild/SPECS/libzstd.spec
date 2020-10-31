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

%define libname zstd

Name:           %{?cross}lib%{libname}
Version:        1.4.5
Release:        1%{?dist}
Summary:        A fast lossless compression algorithm

License:        BSD-3-Clause, GPLv2
URL:            https://facebook.github.io/zstd/
%undefine       _disable_source_fetch
Source0:        https://github.com/facebook/zstd/releases/download/v%{version}/zstd-%{version}.tar.gz
%define         SHA256SUM0 98e91c7c6bf162bf90e4e70fdbc41a8188b9fa8de5ad840c401198014406ce9e

BuildRequires:  make
BuildRequires:  cmake

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
BuildRequires: %{?host_tool_prefix}cmake-toolchain
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
BuildRequires: %{?target_tool_prefix}cmake-toolchain
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


%package     -n %{?cross}zstd
Summary:        Command-line utilities for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}zstd

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

cd build/cmake
mkdir build
cd build
cmake \
%if "%{_build}" != "%{_target}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_target}/cmake_toolchain \
%endif
    -DZSTD_BUILD_STATIC=0 \
    -DZSTD_PROGRAMS_LINK_SHARED=1 \
    -DCMAKE_INSTALL_PREFIX=%{_prefix} ..
%make_build

%install
cd build/cmake/build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING LICENSE
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/cmake/zstd
%{_prefix}/lib/pkgconfig/*.pc

%files -n %{?cross}zstd
%{_bindir}/*
%doc %{_mandir}/man1/*

%changelog

