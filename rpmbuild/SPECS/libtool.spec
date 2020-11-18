Name:           libtool
Version:        2.4.6
Release:        1%{?dist}
Summary:        Make building against shared libraries easier

License:        GPLv3+
URL:            https://gnu.org/software/libtool
%undefine       _disable_source_fetch
Source0:        https://ftpmirror.gnu.org/libtool/libtool-2.4.6.tar.gz
%define         SHA256SUM0 e3bd4d5d3d025a36c21dd6af7ea818a2afcd4dfc1ea5a17b39d7854bcd0c06e3

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/libtool/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  m4
BuildRequires:  help2man

%undefine _annotated_build
%define debug_package %{nil}

%description

%package     -n libltdl
Summary:        Cross-platform dynamic linking library   
License:        LGPLv2

%description -n libltdl

%package     -n libltdl-devel
Summary:        Development files for libltdl
Requires:       libltdl%{?_isa} = %{version}-%{release}
Requires:       %{?cross}libgpg-error-devel

%description -n libltdl-devel
The libltdl-devel package contains libraries and header files for
developing applications that use libltdl.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
./configure --host=%{_host} --prefix=%{_prefix} --libdir=%{_prefix}/lib --disable-static
%make_build

%install
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'
rm -f %{buildroot}%{_infodir}/dir

%files
%license COPYING
%{_bindir}/*
%{_datadir}/aclocal/*.m4
%{_datadir}/libtool
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%files -n libltdl
%{_prefix}/lib/libltdl.so.*

%files -n libltdl-devel
%{_includedir}/*
%{_prefix}/lib/libltdl.so

%changelog
