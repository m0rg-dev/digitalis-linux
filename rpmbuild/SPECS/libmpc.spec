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

%define libname libmpc

Name:           %{?cross}%{libname}
Version:        1.2.1
Release:        1%{?dist}
Summary:        GNU MPC is a C library for the arithmetic of complex numbers with arbitrarily high precision and correct rounding of the result.

License:        LGPLv3+
URL:            http://www.multiprecision.org/mpc/home.html
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/mpc/mpc-%{version}.tar.gz
%define         SHA256SUM0 17503d2c395dfcf106b622dc142683c1199431d095367c6aacba6eec30340459

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/mpc/"}

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
BuildRequires: %{?target_tool_prefix}libgmp-devel %{?target_tool_prefix}libmpfr-devel

%undefine _annotated_build

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n mpc-%{version}

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
%license COPYING.LESSER
%{_prefix}/lib/*.so.*
%doc %{_infodir}/mpc.info*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 1.2.1 release 1
  Updated to version 1.2.1.

- 2020-11-07 Morgan Thomas <m@m0rg.dev> 1.2.0 release 2
  Remove the generated info directory (if present) before packaging.
