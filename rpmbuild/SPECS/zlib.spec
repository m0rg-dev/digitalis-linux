Name:           zlib
Version:        1.2.11
Release:        1%{?dist}
Summary:        A data compression library.

License:        Zlib
URL:            https://zlib.net/
%undefine       _disable_source_fetch
Source0:        https://zlib.net/%{name}-%{version}.tar.xz
%define         SHA256SUM0 4ff941449631ace0d4d203e3483be9dbc9da454084111f97ea0a2114e19bf066

BuildRequires:  clang make
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

%build
%global optflags %(echo %{optflags} | sed 's/-fstack-clash-protection//')
export CFLAGS="$CFLAGS -ggdb2"

export CC=clang
./configure --prefix=%{_prefix} --libdir=/%{_lib} --sharedlibdir=/%{_lib}
%make_build

%install
rm -rf $RPM_BUILD_ROOT
%make_install
find $RPM_BUILD_ROOT -name '*.la' -exec rm -f {} ';'
find $RPM_BUILD_ROOT -name '*.a' -exec rm -f {} ';'
mkdir -p $RPM_BUILD_ROOT/%{_libdir}
mv $RPM_BUILD_ROOT/%{_lib}/pkgconfig $RPM_BUILD_ROOT/%{_libdir}/

%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig


%files
%license README
/%{_lib}/*.so.*
%{_libdir}/pkgconfig
/usr/share/man/man3/zlib.3.gz

%files devel
%{_includedir}/*
/%{_lib}/*.so


%changelog

