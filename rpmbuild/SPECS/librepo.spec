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
# TODO unify target/usr and target/... but later
%define _prefix /usr/%{_target}/usr
%endif

%define libname librepo

Name:           %{?cross}%{libname}
Version:        1.12.1
Release:        1%{?dist}
Summary:        A library providing C and Python (libcURL like) API for downloading linux repository metadata and packages

License:        LGPLv2
URL:            http://rpm-software-management.github.io/librepo/
%undefine       _disable_source_fetch
Source0:        https://github.com/rpm-software-management/%{libname}/archive/%{version}.tar.gz#/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 b78113f3aeb0d562b034dbeb926609019b7bed27e05c9ab5a584a9938de8da9f

BuildRequires:  make cmake doxygen

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}cmake-toolchain
BuildRequires: %{?target_tool_prefix}glib2-devel %{?target_tool_prefix}openssl-devel %{?target_tool_prefix}libxml2-devel
BuildRequires: %{?target_tool_prefix}libcurl-devel %{?target_tool_prefix}zchunk-devel %{?target_tool_prefix}libpython-devel
BuildRequires: %{?target_tool_prefix}check-devel %{?target_tool_prefix}zlib-devel %{?target_tool_prefix}gpgme-devel

Requires: %{?cross}glib2 %{?cross}openssl %{?cross}libxml2 %{?cross}libcurl %{?cross}zchunk %{?cross}libpython
Requires: %{?cross}zlib %{?cross}gpgme

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?cross}libcurl-devel %{?cross}openssl-devel %{?cross}libxml2-devel

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

mkdir build
cd build
cmake \
%if "%{_build}" != "%{_target}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_target}/cmake_toolchain \
%endif
    -DCMAKE_INSTALL_PREFIX=%{_prefix} -DPYTHON_DESIRED=3 ..
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_prefix}/lib/*.so.*
%exclude %{_prefix}/lib64

%files devel
%{_prefix}/include/librepo
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc

%changelog

