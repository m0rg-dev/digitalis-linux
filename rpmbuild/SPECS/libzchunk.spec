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

%define libname zchunk

Name:           %{?cross}lib%{libname}
Version:        1.1.7
Release:        1%{?dist}
Summary:        zchunk is a compressed file format that splits the file into independent chunks

License:        BSD-2-Clause
URL:            https://github.com/zchunk/zchunk
%undefine       _disable_source_fetch
Source0:        https://github.com/zchunk/%{libname}/archive/%{version}.tar.gz#/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 eb3d531916d6fea399520a2a4663099ddbf2278088599fa09980631067dc9d7b

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/zchunk/zchunk.git", 
# X10-Update-Spec:   "pattern": "^((?:\\d+\\.?)+)$" }

BuildRequires:  meson ninja-build gcc

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
BuildRequires: %{?host_tool_prefix}meson-toolchain
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
BuildRequires: %{?target_tool_prefix}meson-toolchain
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc
BuildRequires: %{?target_tool_prefix}libcurl-devel
BuildRequires: %{?target_tool_prefix}libopenssl-devel

Requires: %{?cross}libcurl %{?cross}libopenssl

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?cross}libffi-devel

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package     -n zchunk
Summary:        Command-line utilities for libzchunk
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n zchunk

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

mkdir build
meson -Dbuildtype=release --prefix=%{_prefix} \
%if "%{_build}" != "%{_target}"
    --cross-file %{_target} \
%endif
    build/
ninja %{?_smp_mflags} -C build

%install
DESTDIR=%{buildroot} ninja -C build install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license LICENSE
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc

%files -n zchunk
%{_bindir}/*
%doc %{_mandir}/man1/*

%changelog

