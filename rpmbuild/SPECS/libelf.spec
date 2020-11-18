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

%define libname libelf

Name:           %{?cross}%{libname}
Version:        0.181
Release:        2%{?dist}
Summary:        A library for working with ELF files

License:        GPLv3+, LGPLv3+, GPLv2
URL:            https://sourceware.org/elfutils/
%undefine       _disable_source_fetch
Source0:        https://sourceware.org/elfutils/ftp/%{version}/elfutils-%{version}.tar.bz2
%define         SHA256SUM0 29a6ad7421ec2acfee489bb4a699908281ead2cb63a20a027ce8804a165f0eb3

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "git://sourceware.org/git/elfutils.git", 
# X10-Update-Spec:   "pattern": "^elfutils-((?:\\d+\\.?)+)$" }

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
BuildRequires: %{?target_tool_prefix}zlib-devel
BuildRequires: m4

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package     -n %{?cross}elfutils
Summary:        Command-line utilities for libelf
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}elfutils

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n elfutils-%{version}

%build

mkdir build
cd build
%define _configure ../configure
%global optflags %(echo "%{optflags}" | sed 's/-flto=auto//')
%configure --host=%{_target} --libdir=%{_prefix}/lib --disable-static --disable-debuginfod --disable-libdebuginfod --program-prefix=eu-
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%find_lang elfutils

%files
%license COPYING COPYING-GPLV2 COPYING-LGPLV3
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%exclude %{_prefix}/lib/*.a
%doc %{_mandir}/man3/*

%files -n %{?cross}elfutils -f build/elfutils.lang
%{_bindir}/*
%doc %{_mandir}/man1/*

%changelog

- 2020-11-07 Morgan Thomas <m@m0rg.dev> 0.181 release 2
  Explicitly disable LTO in case Fedora turned it on
