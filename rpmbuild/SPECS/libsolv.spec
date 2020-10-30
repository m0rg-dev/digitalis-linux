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

%define libname libsolv

Name:           %{?cross}%{libname}
Version:        0.7.16
Release:        1%{?dist}
Summary:        libsolv is a free package dependency solver using a satisfiability algorithm.

License:        BSD-3-Clause
URL:            https://github.com/openSUSE/libsolv
%undefine       _disable_source_fetch
Source0:        https://github.com/openSUSE/%{libname}/archive/%{version}.tar.gz#/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 ed1753255792e9ae0582a1904c4baba5801036ef3efd559b65027e14ee1ea282

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
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}glibc-devel %{?target_tool_prefix}libstdc++-devel
BuildRequires: %{?target_tool_prefix}zlib-devel %{?target_tool_prefix}librpm-devel %{?target_tool_prefix}expat-devel

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

cmake \
%if "%{_build}" != "%{_target}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_target}/cmake_toolchain \
%endif
    -DENABLE_RPMMD=ON -DENABLE_RPMDB=ON -DENABLE_COMPLEX_DEPS=ON \
    -DCMAKE_INSTALL_PREFIX=%{_prefix} ..

%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

# can't get cmake to find this in the right place so we'll put it in
# the wrong place...
%if ! %{isnative}
install -dm755 %{buildroot}/usr/share/cmake/Modules
mv -v %{buildroot}/%{_datadir}/cmake/Modules/*.cmake %{buildroot}/usr/share/cmake/Modules/
%endif


%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig


%files
%license LICENSE.BSD
%{_prefix}/bin/*
%{_prefix}/lib/*.so.*
%doc %{_mandir}/man{1,3}/*

%files devel
%{_includedir}/solv
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
/usr/share/cmake/Modules/*.cmake

%changelog

