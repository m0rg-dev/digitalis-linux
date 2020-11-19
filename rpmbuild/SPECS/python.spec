# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

%define libname python
%define pybasever 3.9
%define general_version %{pybasever}.0

Name:           %{?cross}%{?libname}
Version:        %{general_version}
Release:        1%{?dist}
Summary:        The Python programming language

License:        Python-2.0
URL:            https://www.python.org/
%undefine       _disable_source_fetch
Source0:        https://www.python.org/ftp/python/%{version}/Python-%{version}.tar.xz
%define         SHA256SUM0 9c73e63c99855709b9be0b3cc9e5b072cb60f37311e8c4e50f15576a0bf82854

# no python updates until we figure out how we're doing python updates

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}libffi-devel
BuildRequires: %{?target_tool_prefix}libsqlite-devel %{?target_tool_prefix}zlib-devel
BuildRequires: %{?target_tool_prefix}libncurses-devel
BuildRequires: %{?target_tool_prefix}libbzip2-devel
BuildRequires: make python gcc zlib-devel

Requires:       %{?cross}libpython = %{version}-%{release}
Provides:       %{?cross}python%{pybasever} = %{version}-%{release}

%undefine _annotated_build
%global debug_package %{nil}
# lib2to3 breaks all kinds of stuff on Fedora
# Turn off the brp-python-bytecompile script
%global __os_install_post %(echo '%{__os_install_post}' | sed -e 's!/usr/lib[^[:space:]]*/brp-python-bytecompile[[:space:]].*$!!g')
# Turn off the brp-mangle-shebangs script
%global __os_install_post %(echo '%{__os_install_post}' | sed -e 's!/usr/lib[^[:space:]]*/brp-mangle-shebangs[[:space:]].*$!!g')

%description

%package     -n %{?cross}libpython
Summary:        A library for embedding Python into other applications.
License:        Python-2.0
URL:            https://www.python.org/
Provides:       %{?cross}libpython%{pybasever} = %{version}-%{release}

%description -n %{?cross}libpython

%package     -n %{?cross}libpython-devel
Summary:        Development files for libpython
Requires:       %{?cross}libpython%{?_isa} = %{version}-%{release}
Requires:       python%{pybasever}
Provides:       %{?cross}libpython%{pybasever}-devel = %{version}-%{release}

%description -n %{?cross}libpython-devel
The libpython-devel package contains libraries and header files for
developing applications that use libpython.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n Python-%{version}

%build

./configure --prefix=%{_prefix} --build=%{_build} --host=%{_target} --libdir=%{_prefix}/lib \
    --disable-ipv6 --without-ensurepip \
    --enable-shared \
    ac_cv_file__dev_ptmx=yes \
    ac_cv_file__dev_ptc=no
%make_build

%install
%make_install
find %{buildroot} -name '*.la' -exec rm -f {} ';'
ln -s python3 %{buildroot}/%{_bindir}/python

# cgi.py has a #! /usr/local/bin/python in it and it makes rpm (and therefore me) sad
rm %{buildroot}/%{_prefix}/lib/python%{pybasever}/cgi.py

%files
%license LICENSE
%{_bindir}/*
%doc %{_mandir}/man1/*
%{_prefix}/lib/python%{pybasever}

%files -n %{?cross}libpython
# TODO break this all out
%{_prefix}/lib/*.so.*

%files -n %{?cross}libpython-devel
%{_includedir}/*
%{_prefix}/lib/pkgconfig/*.pc
%{_prefix}/lib/*.so

%changelog

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 3.9.0-1
  Update to version 3.9.0.

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 3.8.3-4
  Explicitly provide libpython%%{pybasever}-devel.

* Sun Nov 15 2020 Morgan Thomas <m@m0rg.dev> 3.8.3-3
  Compile in bzip2 support.
