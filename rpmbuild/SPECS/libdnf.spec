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

%define libname libdnf

Name:           %{?cross}%{libname}
Version:        0.22.4
Release:        1%{?dist}
Summary:        This library provides a high level package-manager.

License:        LGPLv2+
URL:            https://github.com/rpm-software-management/libdnf
%undefine       _disable_source_fetch
Source0:        https://github.com/rpm-software-management/%{libname}/archive/%{version}.tar.gz#/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 33e943d3054ed3e727bc9fc0079d02b10f2108bd6918cf1b22149bedce1470a4

BuildRequires:  cmake swig gettext gtk-doc

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
BuildRequires: %{?target_tool_prefix}zlib-devel %{?target_tool_prefix}glib2-devel %{?target_tool_prefix}libsmartcols-devel
BuildRequires: %{?target_tool_prefix}libsolv-devel %{?target_tool_prefix}check-devel %{?target_tool_prefix}librepo-devel
BuildRequires: %{?target_tool_prefix}libmodulemd-devel %{?target_tool_prefix}libpython-devel %{?target_tool_prefix}cppunit-devel
BuildRequires: %{?target_tool_prefix}gtk-doc %{?target_tool_prefix}json-c-devel

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

cmake -Wno-dev \
%if "%{_build}" != "%{_target}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_target}/cmake_toolchain \
%endif
    -DGTKDOC_SCANGOBJ_WRAPPER=/usr/bin/gtkdoc-scangobj \
    -DCMAKE_INSTALL_PREFIX=%{_prefix} -DPYTHON_DESIRED=3 ..

%make_build -j1

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license LICENSE.BSD
%{_prefix}/bin/*
%{_prefix}/lib/*.so.*
%doc %{_mandir}/man{1,3}/*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/*.a
%{_prefix}/lib/pkgconfig/*.pc

%changelog

