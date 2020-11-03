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

%define libname libxml2

Name:           %{?cross}%{libname}
Version:        2.9.10
Release:        1%{?dist}
Summary:        Libxml2 is the XML C parser and toolkit developed for the Gnome project 

License:        MIT
URL:            http://xmlsoft.org/
%undefine       _disable_source_fetch
Source0:        ftp://xmlsoft.org/%{libname}/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 aafee193ffb8fe0c82d4afef6ef91972cbaf5feea100edc2f262750611b4be1f

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
BuildRequires: %{?target_tool_prefix}zlib-devel
BuildRequires: %{?target_tool_prefix}liblzma-devel
BuildRequires: %{?target_tool_prefix}libpython-devel
BuildRequires: %{?target_tool_prefix}pkg-config

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?cross}zlib-devel
Requires:       %{?cross}liblzma-devel

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%package        utils
Summary:        Command-line utilities for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    utils

%build

mkdir build
cd build
%define _configure ../configure
%configure --host=%{_target} --libdir=%{_prefix}/lib
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_prefix}/lib/*.so.*
%if "%{_build}" == "%{_target}"
%{_prefix}/lib/python3.8/site-packages/*
%doc %{_datadir}/doc/libxml2-python-%{version}
%endif
%doc %{_datadir}/gtk-doc/html/libxml2
%doc %{_datadir}/doc/libxml2-%{version}

%files devel
%{_includedir}/libxml2
%{_prefix}/lib/*.so
%{_prefix}/lib/*.a
# was this supposed to go in libexec or something?
%{_prefix}/lib/xml2Conf.sh
%{_prefix}/lib/pkgconfig/*.pc
%{_prefix}/lib/cmake/libxml2
%{_datadir}/aclocal/*.m4
%doc %{_mandir}/man3/*

%files utils
%{_bindir}/*
%doc %{_mandir}/man1/*

%changelog

