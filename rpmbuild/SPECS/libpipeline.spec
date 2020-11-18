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

%define libname libpipeline

Name:           %{?cross}%{libname}
Version:        1.5.3
Release:        1%{?dist}
Summary:        Subprocess pipeline manipulation library.

License:        GPLv3+
URL:            http://libpipeline.nongnu.org/
%undefine       _disable_source_fetch
Source0:        http://download.savannah.nongnu.org/releases/libpipeline/libpipeline-%{version}.tar.gz
%define         SHA256SUM0 5dbf08faf50fad853754293e57fd4e6c69bb8e486f176596d682c67e02a0adb0

# X10-Update-Spec: { "type": "webscrape", "url": "http://download.savannah.nongnu.org/releases/libpipeline/"}

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
%doc %{_mandir}/man3/*

%changelog

