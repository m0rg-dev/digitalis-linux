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

%define libname zlib

Name:           %{?cross}%{libname}
Version:        1.2.11
Release:        1%{?dist}
Summary:        A lossless data compression library

License:        Zlib
URL:            https://zlib.net/
%undefine       _disable_source_fetch
Source0:        https://zlib.net/zlib-%{version}.tar.xz
%define         SHA256SUM0 4ff941449631ace0d4d203e3483be9dbc9da454084111f97ea0a2114e19bf066

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

%undefine _annotated_build
%global debug_package %{nil}

%description
zlib is designed to be a free, general-purpose, legally unencumbered -- that is, not covered by any patents -- lossless data-compression library for use on virtually any computer hardware and operating system.

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
CC=%{?target_tool_prefix}gcc %{_configure} --prefix=%{_prefix} --enable-shared
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'
rm -v %{buildroot}/%{_prefix}/lib/libz.a

%files
%license README
%{_prefix}/lib/*.so.*
%{_prefix}/lib/pkgconfig/zlib.pc

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%doc %{_mandir}/man3/zlib.*

%changelog

