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

%define libname check

Name:           %{?cross}%{libname}
Version:        0.15.2
Release:        1%{?dist}
Summary:        Check is a unit testing framework for C.

License:        LGPLv2
URL:            https://libcheck.github.io/check/
%undefine       _disable_source_fetch
Source0:        https://github.com/libcheck/%{libname}/releases/download/%{version}/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 a8de4e0bacfb4d76dd1c618ded263523b53b85d92a146d8835eb1a52932fa20a

BuildRequires:  make autoconf automake libtool

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}glibc-devel

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
autoreconf --install

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

%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig


%files
%license COPYING.LESSER
%{_prefix}/lib/*.so.*
%doc %{_mandir}/man1/*
%doc %{_infodir}/*.info*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/*.a
%{_datadir}/aclocal/*.m4
%{_prefix}/lib/pkgconfig/*.pc
%doc %{_datadir}/doc/check
%{_bindir}/checkmk

%changelog

