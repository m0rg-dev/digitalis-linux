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

%define libname file

Name:           %{?cross}%{libname}
Version:        5.39
Release:        1%{?dist}
Summary:        A utility for determining the type of a file.

License:        BSD-2-Clause
URL:            http://astron.com/pub/file/
%undefine       _disable_source_fetch
Source0:        http://astron.com/pub/%{libname}/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 f05d286a76d9556243d0cb05814929c2ecf3a5ba07963f8f70bfaaa70517fad1

# X10-Update-Spec: { "type": "webscrape", "url": "http://astron.com/pub/file/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc
BuildRequires:  gcc make

Requires:       %{?cross}libmagic

%undefine _annotated_build

%description

%package     -n %{?cross}libmagic
Summary:        file(1), but library
License:        BSD-2-Clause
URL:            http://astron.com/pub/file/

%description -n %{?cross}libmagic

%package     -n %{?cross}libmagic-devel
Summary:        Development files for libmagic
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}libmagic-devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build
# local version of file needs to be >= the version we're building here for cross-compiling.
# easiest way to do that is to build it ourselves.
%if "%{_build}" != "%{_target}"
mkdir build
cd build
../configure
%{__make} %{?_smp_mflags}
%{__make} install
cd ..
%endif

%configure --host=%{_target} --libdir=%{_prefix}/lib
%make_build

%install
%make_install
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_bindir}/*
%doc %{_mandir}/man1/*

%files -n %{?cross}libmagic
%{_datadir}/misc/magic.mgc
%{_prefix}/lib/*.so.*
%{_prefix}/lib/pkgconfig/libmagic.pc
%doc %{_mandir}/man4/*

%files -n %{?cross}libmagic-devel
%{_prefix}/lib/*.so
%{_includedir}/magic.h
%doc %{_mandir}/man3/*

%changelog
