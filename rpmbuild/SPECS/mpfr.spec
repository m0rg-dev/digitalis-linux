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

%define libname mpfr

Name:           %{?cross}%{libname}
Version:        4.1.0
Release:        1%{?dist}
Summary:        The MPFR library is a C library for multiple-precision floating-point computations with correct rounding. 

License:        LGPLv3+
URL:            https://www.mpfr.org/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{libname}/%{libname}-%{version}.tar.xz
%define         SHA256SUM0 0c98a3f1732ff6ca4ea690552079da9c597872d30e96ec28414ee23c95558a7f

BuildRequires:  make

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}glibc-devel
BuildRequires: %{?target_tool_prefix}gmp-devel

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
%autosetup -n %{libname}-%{version}

%build

mkdir build
cd build
%define _configure ../configure
%configure --host=%{_target} --libdir=%{_prefix}/lib
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig


%files
%license COPYING COPYING.LESSER
%{_prefix}/lib/*.so.*
%doc %{_datadir}/doc/mpfr
%doc %{_infodir}/mpfr.info*
%{_prefix}/lib/pkgconfig/mpfr.pc

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/*.a

%changelog

