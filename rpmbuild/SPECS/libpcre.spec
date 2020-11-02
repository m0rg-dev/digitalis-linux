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

%define libname pcre

Name:           %{?cross}lib%{libname}
Version:        8.44
Release:        1%{?dist}
Summary:        Perl Compatible Regular Expressions

License:        BSD
URL:            https://pcre.org
%undefine       _disable_source_fetch
Source0:        https://ftp.pcre.org/pub/pcre/%{libname}-%{version}.tar.bz2
%define         SHA256SUM0 19108658b23b3ec5058edc9f66ac545ea19f9537234be1ec62b714c84399366d

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

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package     -n %{?cross}pcre
Summary:        Command-line utilities for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}pcre

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
%license LICENCE
%{_prefix}/lib/*.so.*

%files devel
%{_bindir}/pcre-config
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%doc %{_datadir}/doc/pcre
%doc %{_mandir}/man3/*
%doc %{_mandir}/man1/pcre-config.1*

%files -n %{?cross}pcre
%{_bindir}/pcretest
%{_bindir}/pcregrep
%doc %{_mandir}/man1/pcregrep.1*
%doc %{_mandir}/man1/pcretest.1*

%changelog

