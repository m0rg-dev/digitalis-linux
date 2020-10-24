Name:           file
Version:        5.39
Release:        1%{?dist}
Summary:        A utility for determining the type of a file.

License:        BSD-2-Clause
URL:            http://astron.com/pub/file/
%undefine       _disable_source_fetch
Source0:        http://astron.com/pub/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 f05d286a76d9556243d0cb05814929c2ecf3a5ba07963f8f70bfaaa70517fad1

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}glibc-devel
BuildRequires:  gcc make

Requires:       libmagic

%undefine _annotated_build

%description

%package     -n libmagic
Summary:        file(1), but library
License:        BSD-2-Clause
URL:            http://astron.com/pub/file/

%description -n libmagic

%package     -n libmagic-devel
Summary:        Development files for libmagic
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n libmagic-devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
# local version of file needs to be >= the version we're building here for cross-compiling.
# easiest way to do that is to build it ourselves.
%if "%{_build}" != "%{_host}"
mkdir build
cd build
../configure
%{__make} %{?_smp_mflags}
%{__make} install
cd ..
%endif

%configure --libdir=%{_prefix}/lib
%make_build

%install
%make_install
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_bindir}/*
%doc %{_mandir}/man1/*.gz

%files -n libmagic
%{_datadir}/misc/magic.mgc
%{_prefix}/lib/*.so.*
%{_prefix}/lib/pkgconfig/libmagic.pc
%doc %{_mandir}/man4/*.gz

%files -n libmagic-devel
%{_prefix}/lib/*.so
%{_includedir}/magic.h
%doc %{_mandir}/man3/*.gz

%changelog
