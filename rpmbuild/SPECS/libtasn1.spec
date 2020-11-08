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

%define libname libtasn1

Name:           %{?cross}%{libname}
Version:        4.16.0
Release:        1%{?dist}
Summary:        ASN.1 certificate library

License:        LGPLv2+
URL:            https://gnu.org/software/libtasn1
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{libname}/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 0e0fb0903839117cb6e3b56e68222771bebf22ad7fc2295a0ed7d576e8d4329d

BuildRequires:  make

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

%package     -n %{?cross}tasn1
Summary:        Command-line utilities for %{libname}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}tasn1

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

mkdir build
cd build
%define _configure ../configure
%configure --host=%{_target} --libdir=%{_prefix}/lib --disable-static
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'
rm -f %{buildroot}%{_infodir}/dir

%files
%license LICENSE
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%doc %{_mandir}/man3/*
%doc %{_infodir}/*.info*

%files -n %{?cross}tasn1
%{_bindir}/*
%doc %{_mandir}/man1/*

%changelog

- 2020-11-07 Morgan Thomas <m@m0rg.dev> <no version change>
  Remove the generated info directory (if present) before packaging.
