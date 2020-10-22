Name:           mpfr
Version:        4.1.0
Release:        1%{?dist}
Summary:        The MPFR library is a C library for multiple-precision floating-point computations with correct rounding.

License:        LGPLv3+
URL:            https://www.mpfr.org
%undefine       _disable_source_fetch
Source0:        https://www.mpfr.org/%{name}-%{version}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 0c98a3f1732ff6ca4ea690552079da9c597872d30e96ec28414ee23c95558a7f

BuildRequires:  clang make gmp-devel
Requires:       gmp

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
%configure CC=clang CXX=clang++ --disable-static --docdir=/usr/share/doc/%{name}-%{version} --enable-thread-safe
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
%{_libdir}/pkgconfig

%files devel
%doc /usr/share/doc/%{name}-%{version}/
%{_includedir}/*
%{_libdir}/*.so


%changelog

