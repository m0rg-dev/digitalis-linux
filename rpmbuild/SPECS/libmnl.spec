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

%define libname libmnl

Name:           %{?cross}%{libname}
Version:        1.0.4
Release:        1%{?dist}
Summary:        Minimal Netlink library

License:        LGPLv2
URL:            https://www.netfilter.org/projects/libmnl/index.html
%undefine       _disable_source_fetch
Source0:        https://www.netfilter.org/projects/libmnl/files/libmnl-%{version}.tar.bz2
%define         SHA256SUM0 171f89699f286a5854b72b91d06e8f8e3683064c5901fb09d954a9ab6f551f81

# X10-Update-Spec: { "type": "webscrape", "url": "https://www.netfilter.org/projects/libmnl/files/"}

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

mkdir build
cd build
%define _configure ../configure
%configure --host=%{_target} --libdir=%{_prefix}/lib --disable-static
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc

%changelog

