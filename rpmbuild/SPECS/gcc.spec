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

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}g++ %{?host_tool_prefix}glibc-devel
BuildRequires:  %{?host_tool_prefix}mpfr-devel %{?host_tool_prefix}libmpc-devel %{?host_tool_prefix}gmp-devel
BuildRequires:  %{?host_tool_prefix}libstdc++-devel %{?host_tool_prefix}zlib-devel

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
BuildRequires: %{?target_tool_prefix}glibc-devel
%endif

# TODO should be its own package
Provides:       %{?cross}g++

%description

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
    --program-prefix=%{_target}- \
    --libdir=%{_prefix}/lib \
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
%endif
    %{?with_threads:--enable-threads} \
    %{!?with_threads:--disable-threads} \
    --enable-linker-build-id \
    --disable-libstdcxx \
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
%{_bindir}/*
%{_prefix}/lib/gcc/%{_target}/%{version}
%{_libexecdir}/gcc/%{_target}/%{version}
%doc %{_infodir}/*.info*
%doc %{_mandir}/man{1,7}/*
/usr/lib64/libcc1.so*

%changelog
