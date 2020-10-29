# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%endif

Name:           %{?cross}binutils
Version:        2.34
Release:        1%{?dist}
Summary:        The GNU Binutils are a collection of binary tools.

License:        GPLv3+
URL:            https://www.gnu.org/software/binutils/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/binutils/binutils-%{version}.tar.xz
%define         SHA256SUM0 f00b0e8803dc9bab1e2165bd568528135be734df3fabf8d0161828cd56028952

BuildRequires:  make zlib-devel
BuildRequires:  /usr/bin/pod2man /usr/bin/makeinfo

# We need some host tools. If build == host, we can use non-prefixed versions; otherwise,
# we need prefixed host tools.
%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}glibc-devel

# We also need some build machine tools! Those will always be non-prefixed.
BuildRequires:  gcc

%undefine _annotated_build
%global debug_package %{nil}

%description

%if %{isnative}

%package     -n libbfd
Summary:        A library for object file manipulation
License:        LGPLv3+

%description -n libbfd

%package     -n libbfd-devel
Summary:        Development files for libbfd
Requires:       libbfd%{?_isa} = %{version}-%{release}

%description -n libbfd-devel
The libbfd-devel package contains libraries and header files for
developing applications that use libbfd.

%package     -n libctf
Summary:        The Compat ANSI-C Type Format debugging support library
License:        LGPLv3+

%description -n libctf

%package     -n libctf-devel
Summary:        Development files for libctf
Requires:       libctf%{?_isa} = %{version}-%{release}

%description -n libctf-devel
The libctf-devel package contains libraries and header files for
developing applications that use libctf.

%package     -n libopcodes
Summary:        A library for dealing with opcodes
License:        LGPLv3+

%description -n libopcodes

%package     -n libopcodes-devel
Summary:        Development files for libopcodes
Requires:       libopcodes%{?_isa} = %{version}-%{release}
Requires:       libbfd-devel

%description -n libopcodes-devel
The libopcodes-devel package contains libraries and header files for
developing applications that use libopcodes.

%endif

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n binutils-%{version}

%build

%configure \
    --disable-werror \
    --libdir=%{_prefix}/lib \
%if %{isnative}
    --enable-shared \
%else
    --target=%{_target} \
    --with-sysroot=/usr/%{_prefix} \
    --program-prefix=%{_target}- 
%endif

%make_build

%install
%make_install
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%find_lang binutils
%find_lang gprof
%find_lang ld
%find_lang bfd
%find_lang opcodes
%find_lang gas

ldconfig -Nr %{buildroot}

%files -f binutils.lang -f gprof.lang -f ld.lang -f bfd.lang -f opcodes.lang -f gas.lang
%license COPYING COPYING3 COPYING3.LIB COPYING.LIB
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*
%{_prefix}/%{_target}/bin/*
%{_prefix}/%{_target}/lib/ldscripts

%if %{isnative}

%files -n libbfd
%license COPYING3.LIB COPYING.LIB
%{_prefix}/lib/libbfd-%{version}.so
%{_prefix}/lib/libbfd.so

%files -n libbfd-devel
%{_prefix}/lib/libbfd.a
%{_includedir}/bfd*
%{_includedir}/ansidecl.h
%{_includedir}/diagnostics.h
%{_includedir}/symcat.h
%{_includedir}/plugin-api.h

%files -n libctf
%license COPYING3.LIB COPYING.LIB
%{_prefix}/lib/libctf{,-nobfd}.so.*

%files -n libctf-devel
%{_prefix}/lib/libctf{,-nobfd}.so
%{_prefix}/lib/libctf{,-nobfd}.a
%{_includedir}/ctf*

%files -n libopcodes
%license COPYING3.LIB COPYING.LIB
%{_prefix}/lib/libopcodes-%{version}.so
%{_prefix}/lib/libopcodes.so

%files -n libopcodes-devel
%{_prefix}/lib/libopcodes.a
%{_includedir}/dis-asm.h

%endif

%changelog
