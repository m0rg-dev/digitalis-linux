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

%define libname libcomps

Name:           %{?cross}%{libname}
Version:        0.1.15
Release:        1%{?dist}
Summary:        Libcomps is alternative for yum.comps library

License:        GPLv2
URL:            https://github.com/rpm-software-management/libcomps
%undefine       _disable_source_fetch
Source0:        https://github.com/rpm-software-management/libcomps/archive/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 3304bf7b178fd719fff6fe67f365b63e486f2f5e3e6e0ff1780f42723776cb61

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
BuildRequires: %{?target_tool_prefix}zlib-devel
BuildRequires: %{?target_tool_prefix}libxml2-devel
BuildRequires: %{?target_tool_prefix}libexpat-devel
BuildRequires: %{?target_tool_prefix}libcheck-devel
BuildRequires: %{?target_tool_prefix}libpython-devel

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?cross}libexpat-devel

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{libname}-%{version}

%build

mkdir build
cd build

cmake \
%if "%{_build}" != "%{_target}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_target}/cmake_toolchain \
%endif
    -DCMAKE_INSTALL_PREFIX=%{_prefix} -DPYTHON_DESIRED=3 ../libcomps

%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_prefix}/lib/*.so.*
%if %{isnative}
/usr/lib64/python3.8/site-packages/libcomps*
%else
%exclude /usr/lib64/python3.8/site-packages/libcomps*
%endif

%files devel
%{_includedir}/libcomps
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc

%changelog

