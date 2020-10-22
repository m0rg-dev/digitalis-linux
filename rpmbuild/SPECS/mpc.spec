Name:           mpc
Version:        1.2.0
Release:        1%{?dist}
Summary:        GNU MPC is a C library for the arithmetic of complex numbers with arbitrarily high precision and correct rounding of the result.

License:        LGPLv3+
URL:            https://www.gnu.org/software/mpc/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 e90f2d99553a9c19911abdb4305bf8217106a957e3994436428572c8dfe8fda6

BuildRequires:  clang make gmp-devel mpfr-devel
Requires:       gmp mpfr

%description


%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%global optflags %(echo %{optflags} | sed 's/-fstack-clash-protection//')
export CFLAGS="$CFLAGS -ggdb2"

mkdir build
cd build
%define _configure ../configure
%configure CC=clang CXX=clang++ --disable-static --docdir=/usr/share/doc/%{name}-%{version}
%make_build

%install
rm -rf $RPM_BUILD_ROOT
cd build
%make_install
find $RPM_BUILD_ROOT -name '*.la' -exec rm -f {} ';'


%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig


%files
%license COPYING.LESSER
%doc /usr/share/info/%{name}.info.gz
%{_libdir}/*.so.*

%files devel
#%doc /usr/share/doc/%{name}-%{version}/
%{_includedir}/*
%{_libdir}/*.so


%changelog

