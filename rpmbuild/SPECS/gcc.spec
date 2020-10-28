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

%bcond_without threads
# general "make it depend on less stuff" option for bootstrapping toolchains
%bcond_with    standalone

%if %{with standalone}
%define standalone_flag standalone-
%endif

Name:           %{?cross}%{?standalone_flag}gcc
Version:        10.2.0
Release:        1%{?dist}
Summary:        The GNU Compiler Collection includes front ends for C, C++, Objective-C, Fortran, Ada, Go, and D, as well as libraries for these languages (libstdc++,...).

License:        GPLv3+ and GPLv3+ with exceptions and GPLv2+ with exceptions and LGPLv2+ and BSD
URL:            https://www.gnu.org/software/gcc/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/gcc/gcc-%{version}/gcc-%{version}.tar.xz
%define         SHA256SUM0 b8dd4368bb9c7f0b98188317ee0254dd8cc99d1e3a18d0ff146c855fe16c1d8c

BuildRequires:  gcc g++ make diffutils
BuildRequires:  /usr/bin/makeinfo
Requires:       zlib mpfr libmpc gmp

# We need some host tools. If build == host, we can use non-prefixed versions; otherwise,
# we need prefixed host tools.
%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}g++
BuildRequires:  %{?host_tool_prefix}mpfr-devel %{?host_tool_prefix}libmpc-devel %{?host_tool_prefix}gmp-devel
BuildRequires:  %{?host_tool_prefix}zlib-devel

# Similarly, we always need target tools. If we're building a cross-compiler, we need
# target-specific tools; otherwise, we just need the host tools.
%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%elif 0%{!?host_tool_prefix:1}
%define target_tool_prefix %{host_tool_prefix}
%endif

BuildRequires:  %{?target_tool_prefix}binutils
Requires:       %{?target_tool_prefix}binutils

%if %{without standalone}
Requires:       %{?cross}libatomic %{?cross}libgcc_s %{?cross}libgomp %{?cross}libquadmath %{?cross}libssp
BuildRequires:  %{?cross}glibc-devel
Requires:       %{?cross}glibc-devel
%endif

%description

%package     -n %{?cross}g++
Summary:        The GNU C++ compiler.
Requires:       %{?cross}gcc = %{version}-%{release}

%if %{without standalone}
Requires:       %{?cross}libstdc++-devel
%endif

%description -n %{?cross}g++

%if %{without standalone}

%package -n %{?cross}libatomic
Summary:        GCC atomic runtime support library.

%description -n %{?cross}libatomic

%package -n %{?cross}libgcc_s
Summary:        GCC runtime support library.

%description -n %{?cross}libgcc_s

%package -n %{?cross}libgomp
Summary:        GNU implementation of the OpenMP API.

%description -n %{?cross}libgomp

%package -n %{?cross}libquadmath
Summary:        GCC quad-precision math library.

%description -n %{?cross}libquadmath

%package -n %{?cross}libssp
Summary:        GCC stack-smashing protection runtime support library.

%description -n %{?cross}libssp

%package -n %{?cross}libasan
Summary:        GCC address sanitization library.

%description -n %{?cross}libasan

%package -n %{?cross}libitm
Summary:        GNU transactional memory library.

%description -n %{?cross}libitm

%package -n %{?cross}liblsan
Summary:        GCC leak sanitization library.

%description -n %{?cross}liblsan

%package -n %{?cross}libtsan
Summary:        GCC thread sanitization library.

%description -n %{?cross}libtsan

%package -n %{?cross}libubsan
Summary:        GCC undefined behavior sanitization library.

%description -n %{?cross}libubsan

%package -n %{?cross}libstdc++
Summary: The GNU standard C library.
License: LGPLv2+

%description -n %{?cross}libstdc++

%package     -n %{?cross}libstdc++-devel
Summary:        Development files for libstdc++
Requires:       %{?cross}libstdc++%{?_isa} = %{version}-%{release}
# stdlib.h depends on linux/errno.h
Requires:       %{?target_tool_prefix}kernel-headers
Requires:       %{?cross}libasan %{?cross}libitm %{?cross}liblsan %{?cross}libtsan %{?cross}libubsan

%description -n %{?cross}libstdc++-devel
The libstdc++-devel package contains libraries and header files for
developing applications that use libstdc++.

%endif

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n gcc-%{version}
# Force the library search path to /lib instead of /lib64. Probably oughta
# make this a patch eventually...
sed -i.orig '/m64=/s/lib64/lib/' gcc/config/i386/t-linux64

%build
mkdir build
cd build
%undefine _annotated_build
%define _configure ../configure
# this is apparently a known upstream issue
%global optflags %(echo %{optflags} | sed 's/-Werror=format-security//')
%configure --enable-languages=c,c++ --disable-multilib --with-system-zlib \
%if ! %{isnative}
    --target=%{_target} \
    --with-sysroot=/usr/%{_target}/ \
    --with-build-sysroot=/usr/%{_target}/ \
    --program-prefix=%{_target}- \
    --libdir=%{_prefix}/lib \
    --with-includedir=/usr/%{_target}/usr/include \
    --with-gxx-include-dir=/usr/%{_target}/usr/include/c++ \
%endif
%if %{with standalone}
    --disable-shared \
    --with-newlib \
    --without-headers \
    --enable-initfini-array \
    --disable-decimal-float \
    --disable-libatomic                            \
    --disable-libgomp                              \
    --disable-libquadmath                          \
    --disable-libssp                               \
    --disable-libvtv                               \
    --disable-libstdcxx                            \
%endif
    %{?with_threads:--enable-threads} \
    %{!?with_threads:--disable-threads} \
    --enable-linker-build-id \
    --disable-bootstrap

%make_build

%install
cd build
%make_install
cd ..

# TODO figure out if we need to do this all the time
cat gcc/limitx.h gcc/glimits.h gcc/limity.h > \
  %{buildroot}/%{_prefix}/lib/gcc/%{_target}/%{version}/include-fixed/limits.h

find %{buildroot} -name '*.la' -exec rm -f {} ';'

# should we link into /usr/_target/bin?

%find_lang gcc
%find_lang cpplib

%files -f gcc.lang -f cpplib.lang
%license COPYING COPYING.LIB COPYING.RUNTIME COPYING3 COPYING3.LIB

%{_bindir}/%{?cross}cpp
%{_bindir}/%{?cross}gcc
%{_bindir}/%{?cross}gcc-%{version}
%{_bindir}/%{?cross}gcc-ar
%{_bindir}/%{?cross}gcc-nm
%{_bindir}/%{?cross}gcc-ranlib
%{_bindir}/%{?cross}gcov
%{_bindir}/%{?cross}gcov-dump
%{_bindir}/%{?cross}gcov-tool
%{_bindir}/%{?cross}lto-dump


%{_prefix}/lib/gcc/%{_target}/%{version}/install-tools
%{_prefix}/lib/gcc/%{_target}/%{version}/include
%{_prefix}/lib/gcc/%{_target}/%{version}/include-fixed
%{_prefix}/lib/gcc/%{_target}/%{version}/*.o
%{_prefix}/lib/gcc/%{_target}/%{version}/libgcc.a
%{_prefix}/lib/gcc/%{_target}/%{version}/libgcc_eh.a
%{_prefix}/lib/gcc/%{_target}/%{version}/libgcov.a
%{_prefix}/lib/gcc/%{_target}/%{version}/plugin

%{_libexecdir}/gcc/%{_target}/%{version}/plugin
%{_libexecdir}/gcc/%{_target}/%{version}/cc1
%{_libexecdir}/gcc/%{_target}/%{version}/collect2
%{_libexecdir}/gcc/%{_target}/%{version}/lto-wrapper
%{_libexecdir}/gcc/%{_target}/%{version}/lto1
%{_libexecdir}/gcc/%{_target}/%{version}/install-tools
%{_libexecdir}/gcc/%{_target}/%{version}/liblto_plugin.so*

%doc %{_infodir}/cpp.info*
%doc %{_infodir}/cppinternals.info*
%doc %{_infodir}/gcc.info*
%doc %{_infodir}/gccinstall.info*
%doc %{_infodir}/gccint.info*
%doc %{_mandir}/man7/*
%doc %{_mandir}/man1/%{?cross}cpp.*
%doc %{_mandir}/man1/%{?cross}gcc.*
%doc %{_mandir}/man1/%{?cross}gcov-dump.*
%doc %{_mandir}/man1/%{?cross}gcov-tool.*
%doc %{_mandir}/man1/%{?cross}gcov.*
%doc %{_mandir}/man1/%{?cross}lto-dump.*

%if %{isnative}
/usr/lib64/libcc1.so*
%else
%exclude /usr/lib64/libcc1.so*
%endif

%files -n %{?cross}g++
%{_bindir}/%{?cross}g++
%{_bindir}/%{?cross}c++
%{_libexecdir}/gcc/%{_target}/%{version}/cc1plus

%doc %{_mandir}/man1/%{?cross}g++.*

%if %{without standalone}

%if %{isnative}
%define rootlib /lib
%define inc /usr/include
%else
%define rootlib /usr/%{_target}/lib
%define inc /usr/%{_target}/usr/include
%endif

%files -n %{?cross}libatomic
%{rootlib}/libatomic*

%files -n %{?cross}libgcc_s
%{rootlib}/libgcc_s*

%files -n %{?cross}libgomp
%{rootlib}/libgomp*
%doc %{_infodir}/libgomp.info*

%files -n %{?cross}libquadmath
%{rootlib}/libquadmath*
%doc %{_infodir}/libquadmath.info*

%files -n %{?cross}libssp
%{rootlib}/libssp*

%files -n %{?cross}libasan
%{rootlib}/libasan*

%files -n %{?cross}libitm
%{rootlib}/libitm*
%doc %{_infodir}/libitm.info*

%files -n %{?cross}liblsan
%{rootlib}/liblsan*

%files -n %{?cross}libtsan
%{rootlib}/libtsan*

%files -n %{?cross}libubsan
%{rootlib}/libubsan*

%files -n %{?cross}libstdc++
%{rootlib}/libstdc++.so.*

%files -n %{?cross}libstdc++-devel
%{inc}/c++
%{rootlib}/libstdc++.so
%{rootlib}/libstdc++.a
%{rootlib}/libsupc++.a
%{rootlib}/libstdc++fs.a
%{rootlib}/libsanitizer.spec
%{_datadir}/gcc-%{version}/python/libstdcxx

%endif

%changelog
