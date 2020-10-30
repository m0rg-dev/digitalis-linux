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

Name:           %{?cross}libstdc++
Version:        10.2.0
Release:        1%{?dist}
Summary:        The standard C++ library.

License:        GPLv3+ and GPLv3+ with exceptions and GPLv2+ with exceptions and LGPLv2+ and BSD
URL:            https://www.gnu.org/software/gcc/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/gcc/gcc-%{version}/gcc-%{version}.tar.xz
%define         SHA256SUM0 b8dd4368bb9c7f0b98188317ee0254dd8cc99d1e3a18d0ff146c855fe16c1d8c

BuildRequires:  make /lib/cpp

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n gcc-%{version}

%build

# libstdc++ doesn't build with _FORTIFY_SOURCE apparently
%global optflags %(echo %{optflags} | sed 's/-Wp,-D_FORTIFY_SOURCE=2//')

mkdir build
cd build
%define _configure ../libstdc++-v3/configure
%configure \
    --host=%{_target} \
%if ! %{isnative}
    --with-gxx-include-dir=%{_prefix}/../%{_target}/include/c++/%{version} \
%endif
    --disable-multilib \
    --disable-nls \
    --disable-libstdcxx-threads \
    --disable-libstdcxx-pch
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'


%files
%license COPYING.LIB COPYING3.LIB
%{_prefix}/lib/*.so.*
%{_datadir}/gcc-%{version}/python/libstdcxx

%files devel
%if %{isnative}
%{_includedir}/*
# isn't c++ fun
%exclude %{_includedir}/*.h
%else
%{_prefix}/../%{_target}/include/c++/%{version}
%endif
%{_prefix}/lib/*.so
%{_prefix}/lib/*.a



%changelog

