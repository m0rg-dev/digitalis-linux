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

%define libname libaio

Name:           %{?cross}%{libname}
Version:        0.3.112
Release:        1%{?dist}
Summary:        The Linux asynchronous I/O library

License:        LGPLv2
URL:            https://pagure.io/libaio
%undefine       _disable_source_fetch
Source0:        https://releases.pagure.org/libaio/libaio-%{version}.tar.gz
%define         SHA256SUM0 ab0462f2c9d546683e5147b1ce9c195fe95d07fac5bf362f6c01637955c3b492

# X10-Update-Spec: { "type": "webscrape", "url": "https://releases.pagure.org/libaio/"}

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
CC=%{?target_tool_prefix}gcc %make_build

%install
CC=%{?target_tool_prefix}gcc %make_install prefix=%{_prefix} libdir=%{_prefix}/lib

find %{buildroot} -name '*.a' -exec rm -f {} ';'
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so

%changelog

