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
Version:        0.54.2
Release:        1%{?dist}
Summary:        This library provides a high level package-manager.

License:        LGPLv2+
URL:            https://github.com/rpm-software-management/libdnf
%undefine       _disable_source_fetch
Source0:        https://github.com/rpm-software-management/%{libname}/archive/%{version}.tar.gz#/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 090a417e1d620f3fc196bc5de36c03d7f0d6ebe2bb87346eba89560101280c01

BuildRequires:  cmake make swig gettext gtk-doc

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
BuildRequires: %{?target_tool_prefix}zlib-devel %{?target_tool_prefix}glib2-devel %{?target_tool_prefix}libsmartcols-devel
BuildRequires: %{?target_tool_prefix}libsolv-devel %{?target_tool_prefix}libcheck-devel %{?target_tool_prefix}librepo-devel
BuildRequires: %{?target_tool_prefix}libmodulemd-devel %{?target_tool_prefix}libpython-devel %{?target_tool_prefix}libcppunit-devel
BuildRequires: %{?target_tool_prefix}gtk-doc %{?target_tool_prefix}libjson-c-devel
BuildRequires: %{?target_tool_prefix}libgpgme-devel
BuildRequires: %{?target_tool_prefix}libzchunk-devel
BuildRequires: python-sphinx

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
%autosetup -n %{libname}-%{version} -p1

%build

mkdir build
cd build

cmake -Wno-dev \
%if "%{_build}" != "%{_target}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_target}/cmake_toolchain \
%endif
    -DGTKDOC_SCANGOBJ_WRAPPER=/usr/bin/gtkdoc-scangobj \
    -DCMAKE_INSTALL_PREFIX=%{_prefix} -DPYTHON_DESIRED=3 -DWITH_MAN=0 ..

%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'
%find_lang libdnf

%files -f build/libdnf.lang
%license COPYING
%{_prefix}/lib/*.so.*
%{_prefix}/lib/libdnf
%{_prefix}/lib*/python3.8/site-packages/hawkey
%{_prefix}/lib*/python3.8/site-packages/libdnf
%{_datadir}/locale/*/LC_MESSAGES/libdnf.mo

%files devel
%{_includedir}/libdnf
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%doc %{_datadir}/gtk-doc/html/libdnf

%changelog

