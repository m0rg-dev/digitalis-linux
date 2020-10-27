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

%define libname openssl

Name:           %{?cross}%{libname}
Version:        1.1.1h
Release:        1%{?dist}
Summary:        OpenSSL is a robust, commercial-grade, and full-featured toolkit for the Transport Layer Security (TLS) and Secure Sockets Layer (SSL) protocols.

License:        OpenSSL
URL:            https://www.openssl.org/
%undefine       _disable_source_fetch
Source0:        https://www.openssl.org/source/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 5c9ca8774bd7b03e5784f26ae9e9e6d749c9da2438545077e6b3d755a06595d9

BuildRequires:  make perl

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}glibc-devel %{?target_tool_prefix}zlib-devel

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

./config \
    --prefix=%{_prefix} --libdir=lib \
    --cross-compile-prefix=%{?cross} --openssldir=/etc/ssl shared zlib-dynamic
%make_build

%install
%make_install MANSUFFIX=ssl

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig

%files
%license LICENSE
%if %{isnative}
%{_sysconfdir}/ssl
%else
%exclude %{_sysconfdir}/ssl
%endif
%{_bindir}/*
%{_prefix}/lib/*.so.*
%{_prefix}/lib/engines-1.1
%doc %{_mandir}/man{1,5,7}/*

%files devel
%{_includedir}/openssl
%{_prefix}/lib/*.so
%{_prefix}/lib/*.a
%{_prefix}/lib/pkgconfig/*.pc
%doc %{_mandir}/man3/*
# TODO this probably should get split too - have one package
# own the dir
%doc %{_datadir}/doc/openssl

%changelog

