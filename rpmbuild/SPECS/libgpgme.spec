# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%global _oldprefix %{_prefix}
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

%define libname gpgme

Name:           %{?cross}lib%{libname}
Version:        1.15.0
Release:        1%{?dist}
Summary:        GPGME is the standard library to access GnuPG functions from programming languages. 

License:        LGPLv2+, GPLv2+
URL:            https://www.gnupg.org/
%undefine       _disable_source_fetch
Source0:        https://www.gnupg.org/ftp/gcrypt/%{libname}/%{libname}-%{version}.tar.bz2
%define         SHA256SUM0 0b472bc12c7d455906c8a539ec56da0a6480ef1c3a87aa5b74d7125df68d0e5b

# X10-Update-Spec: { "type": "webscrape", "url": "https://www.gnupg.org/ftp/gcrypt/gpgme"}

BuildRequires:  make gcc /usr/bin/gpgsm
BuildRequires:  swig
BuildRequires:  python
BuildRequires:  libgpg-error-devel

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}libgpg-error-devel
BuildRequires: %{?target_tool_prefix}pkg-config %{?target_tool_prefix}libassuan-devel
BuildRequires: %{?target_tool_prefix}libpython-devel

%undefine _annotated_build
%global debug_package %{nil}

Requires: %{?cross}libassuan %{?cross}libgpg-error

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?cross}libassuan-devel %{?cross}libgpg-error-devel

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package     -n %{?cross}gpgme
Summary:        Command-line utilities for libgpgme
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}gpgme

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}
%build

mkdir build
cd build
%define _configure ../configure
export PYTHON=python3.8
export SYSROOT=%(%{?target_tool_prefix}gcc -print-sysroot)/usr # needed for libgpg-error config??? someday I'll figure that out
%configure --host=%{_target} --libdir=%{_prefix}/lib \
%if "%{_build}" != "%{_target}"
    --with-libassuan-prefix=/usr/%{_target}/usr \
%endif
    --program-prefix=%{?cross} \
    --bindir=%{_oldprefix}/bin \
    --enable-languages=python \
    LDFLAGS="-L/usr/%{_target}/usr/lib" \
    CFLAGS="%{optflags} -I/usr/%{_target}/usr/include/python3.8"

%make_build

%install
cd build
%make_install

%if ! %{isnative}
install -dm755 %{buildroot}/%{_prefix}/bin
ln -sv %{_oldprefix}/bin/%{?cross}gpgme-config %{buildroot}/%{_prefix}/bin/gpgme-config
%endif

find %{buildroot} -name '*.la' -exec rm -f {} ';'
rm -f %{buildroot}%{_infodir}/dir

%files
%license COPYING COPYING.LESSER
%{_prefix}/lib/*.so.*
%{_prefix}/lib*/python3.8/site-packages/gpg*
%doc %{_infodir}/*.info*

%files devel
%{_oldprefix}/bin/%{?cross}gpgme-config
%if ! %{isnative}
%{_prefix}/bin/gpgme-config
%endif
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%{_datadir}/aclocal/*.m4

%files -n %{?cross}gpgme
%{_oldprefix}/bin/%{?cross}gpgme-tool
%{_oldprefix}/bin/%{?cross}gpgme-json

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 1.15.0 release 1
  Updated to version 1.15.0.

- 2020-11-07 Morgan Thomas <m@m0rg.dev> 1.14.0 release 2
  Explicitly set PYTHON.
  Remove the generated info directory (if present) before packaging.
