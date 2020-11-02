Name:           pkgconf
Version:        1.7.3
Release:        1%{?dist}
Summary:        a pkg-config replacement

License:        MIT
URL:            https://github.com/pkgconf/pkgconf
%undefine       _disable_source_fetch
Source0:        https://github.com/pkgconf/%{name}/archive/%{name}-%{version}.tar.gz
%define         SHA256SUM0 8f2c6e9f08adc5773d7fa3c1db1ed03f5fa02ceed037a537ce1195f7c93700ed

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  autoconf
BuildRequires:  automake
BuildRequires:  libtool

Provides:       pkg-config
Requires:       libpkgconf%{?_isa} = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n libpkgconf
Summary:        Library interface to pkgconf
License:        MIT

%description -n libpkgconf

%package     -n libpkgconf-devel
Summary:        Development files for libpkgconf
Requires:       libpkgconf%{?_isa} = %{version}-%{release}

%description -n libpkgconf-devel
The libpkgconf-devel package contains libraries and header files for
developing applications that use libpkgconf.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{name}-%{name}-%{version}

./autogen.sh

%build
%configure --libdir=%{_prefix}/lib --disable-static
%make_build

%install
%make_install

ln -sv pkgconf %{buildroot}/%{_bindir}/pkg-config

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_bindir}/pkgconf
%{_bindir}/pkg-config
%doc %{_mandir}/man{1,5,7}/*
%doc %{_datadir}/doc/pkgconf

%files -n libpkgconf
%license COPYING
%{_prefix}/lib/libpkgconf.so.*
%{_datadir}/aclocal/pkg.m4

%files -n libpkgconf-devel
%{_includedir}/*
%{_prefix}/lib/libpkgconf.so
%{_prefix}/lib/pkgconfig/*.pc

%changelog
