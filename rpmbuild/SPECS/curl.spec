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

%define libname curl

Name:           %{?cross}%{?libname}
Version:        7.73.0
Release:        1%{?dist}
Summary:        Curl is a command line tool and library for transferring data with URLs.

License:        libcurl
URL:            https://curl.haxx.se/
%undefine       _disable_source_fetch
Source0:        https://curl.haxx.se/download/%{libname}-%{version}.tar.xz
%define         SHA256SUM0 7c4c7ca4ea88abe00fea4740dcf81075c031b1d0bb23aff2d5efde20a3c2408a

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}glibc-devel
BuildRequires:  make

Requires:       %{?cross}libcurl = %{version}-%{release}

%undefine _annotated_build
%global debug_package %{nil}

%description

%package     -n %{?cross}libcurl
Summary:        libcurl is a free and easy-to-use client-side URL transfer library.
License:        libcurl
URL:            https://curl.haxx.se/

%description -n %{?cross}libcurl

%package     -n %{?cross}libcurl-devel
Summary:        Development files for libcurl
Requires:       %{?cross}libcurl%{?_isa} = %{version}-%{release}

%description -n %{?cross}libcurl-devel
The libcurl-devel package contains libraries and header files for
developing applications that use libcurl.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build
%configure --libdir=%{_prefix}/lib --with-ca-path=/etc/ssl/certs
%make_build

%install
%make_install
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_bindir}/*
%doc %{_mandir}/man1/*

%files -n %{?cross}libcurl
%{_prefix}/lib/*.so.*

%files -n %{?cross}libcurl-devel
%{_includedir}/curl
%{_prefix}/lib/*.so
%{_prefix}/lib/*.a
%{_prefix}/lib/pkgconfig/*.pc
%{_datadir}/aclocal/*.m4
%doc %{_mandir}/man3/*

%changelog
