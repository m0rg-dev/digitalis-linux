Name:           gmp
Version:        6.2.0
Release:        1%{?dist}
Summary:        GMP is a free library for arbitrary precision arithmetic, operating on signed integers, rational numbers, and floating-point numbers. 

License:        GPLv2 and LGPLv3
URL:            https://www.gnu.org/software/gmp/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 258e6cd51b3fbdfc185c716d55f82c08aff57df0c6fbd143cf6ed561267a1526

BuildRequires:  clang m4 make
BuildRequires:  /usr/bin/makeinfo
#Requires:       

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
cp -v configfsf.guess config.guess
cp -v configfsf.sub config.sub

%build
%global optflags %(echo %{optflags} | sed 's/-fstack-clash-protection//')
export CFLAGS="$CFLAGS -ggdb2"

mkdir build
cd build
%define _configure ../configure
%configure CC=clang CXX=clang++ --disable-static --enable-fat --enable-cxx --docdir=/usr/share/doc/gmp-%{version}
%make_build
make html


%install
rm -rf $RPM_BUILD_ROOT
cd build
%make_install
make DESTDIR=$RPM_BUILD_ROOT install-html
find $RPM_BUILD_ROOT -name '*.la' -exec rm -f {} ';'


%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig


%files
%license COPYING COPYINGv2 COPYINGv3 COPYING.LESSERv3
%doc /usr/share/doc/gmp-%{version}
%doc /usr/share/info/
%{_libdir}/*.so.*
%{_libdir}/pkgconfig

%files devel
#%doc add-devel-docs-here
%{_includedir}/*
%{_libdir}/*.so


%changelog

