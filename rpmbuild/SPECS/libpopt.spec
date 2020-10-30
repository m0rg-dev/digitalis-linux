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

%define libname popt

Name:           %{?cross}lib%{libname}
Version:        1.18
Release:        1%{?dist}
Summary:        This is the popt(3) command line option parsing library.

License:        MIT
URL:            https://github.com/rpm-software-management/popt/
%undefine       _disable_source_fetch
Source0:        http://ftp.rpm.org/%{libname}/releases/%{libname}-1.x/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 5159bc03a20b28ce363aa96765f37df99ea4d8850b1ece17d1e6ad5c24fdc5d1

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
%find_lang popt

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files -f build/popt.lang
%license COPYING
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%doc %{_mandir}/man3/*

%changelog

