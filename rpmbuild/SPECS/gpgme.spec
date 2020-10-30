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

%define libname gpgme

Name:           %{?cross}%{libname}
Version:        1.14.0
Release:        1%{?dist}
Summary:        GPGME is the standard library to access GnuPG functions from programming languages. 

License:        LGPLv2+, GPLv2+
URL:            https://www.gnupg.org/
%undefine       _disable_source_fetch
Source0:        https://www.gnupg.org/ftp/gcrypt/%{libname}/%{libname}-%{version}.tar.bz2
%define         SHA256SUM0 cef1f710a6b0d28f5b44242713ad373702d1466dcbe512eb4e754d7f35cd4307

BuildRequires:  make gcc /usr/bin/gpgsm

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}libgpg-error-devel
BuildRequires: %{?target_tool_prefix}pkg-config %{?target_tool_prefix}libassuan-devel
%undefine _annotated_build
%global debug_package %{nil}

Requires: %{?cross}libassuan %{?cross}libgpg-error

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?cross}libassuan-devel %{?cross}libgpg-error-devel

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
# apparently it can't get these out of pkg-config??
%configure --host=%{_target} --libdir=%{_prefix}/lib --with-libgpg-error-prefix=%{_prefix} --with-libassuan-prefix=%{_prefix}
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING COPYING.LESSER
%{_bindir}/gpgme-tool
%{_bindir}/gpgme-json
%{_prefix}/lib/*.so.*
%doc %{_infodir}/*.info*

%files devel
%{_bindir}/gpgme-config
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%{_prefix}/lib/cmake/*
%{_datadir}/aclocal/*.m4
%{_datadir}/common-lisp

%changelog

