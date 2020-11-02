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

%define libname libxslt

Name:           %{?cross}%{libname}
Version:        1.1.34
Release:        1%{?dist}
Summary:        The XSLT C library for GNOME

License:        MIT
URL:            https://xmlsoft.org/libxslt
%undefine       _disable_source_fetch
Source0:        ftp://xmlsoft.org/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 98b1bd46d6792925ad2dfe9a87452ea2adebf69dcb9919ffd55bf926a7f93f7f

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
BuildRequires: %{?target_tool_prefix}libxml2-devel
BuildRequires: %{?target_tool_prefix}pkg-config

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package     -n %{?cross}xsltproc
Summary:        XML stylesheet processor
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}xsltproc

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
%license COPYING Copyright
%{_prefix}/lib/*.so.*

%files devel
%{_bindir}/xslt-config
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
# ???
%{_prefix}/lib/xsltConf.sh
%{_datadir}/aclocal/libxslt.m4
%doc %{_mandir}/man3/*
%doc %{_datadir}/doc/libxslt-%{version}

%files -n %{?cross}xsltproc
%{_bindir}/xsltproc
%doc %{_mandir}/man1/xsltproc.1*

%changelog

