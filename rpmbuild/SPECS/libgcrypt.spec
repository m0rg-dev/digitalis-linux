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

%define libname libgcrypt

Name:           %{?cross}%{libname}
Version:        1.8.7
Release:        2%{?dist}
Summary:        Libgcrypt is a general purpose cryptographic library originally based on code from GnuPG.

License:        LGPLv2+
URL:            https://gnupg.org/software/libgcrypt/index.html
%undefine       _disable_source_fetch
Source0:        https://gnupg.org/ftp/gcrypt/%{libname}/%{libname}-%{version}.tar.bz2
%define         SHA256SUM0 03b70f028299561b7034b8966d7dd77ef16ed139c43440925fe8782561974748

# X10-Update-Spec: { "type": "webscrape", "url": "https://gnupg.org/ftp/gcrypt/libgcrypt/"}

BuildRequires:  make gcc

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc
BuildRequires: %{?target_tool_prefix}libgpg-error-devel
BuildRequires: %{?target_tool_prefix}pkg-config

Requires:      %{?cross}libgpg-error

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?cross}libgpg-error-devel

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package     -n %{?cross}gcrypt
Summary:        Utility programs for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}gcrypt

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

mkdir build
cd build
%define _configure ../configure
export SYSROOT=%(%{?target_tool_prefix}gcc --print-sysroot)
# --enable-asm doesn't work consistently in cross-compiled environments
%configure \
    --disable-asm \
%if ! %{isnative}
    --program-prefix=%{?cross} \
    --bindir=%{_oldprefix}/bin \
%endif
%if "%{_build}" != "%{_target}"
    --with-libgpg-error-prefix=/usr/%{_target}/usr \
%endif
    --host=%{_target} --libdir=%{_prefix}/lib
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'
rm -f %{buildroot}%{_infodir}/dir

%if ! %{isnative}
install -dm755 %{buildroot}/%{_prefix}/bin
ln -sv %{_oldprefix}/bin/%{?cross}libgcrypt-config %{buildroot}/%{_prefix}/bin/libgcrypt-config
%endif

%files
%license COPYING COPYING.LIB
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_datadir}/aclocal/*.m4
%{_prefix}/lib/pkgconfig/*.pc
%if ! %{isnative}
%{_prefix}/bin/libgcrypt-config
%endif
%{_oldprefix}/bin/%{?cross}libgcrypt-config
%doc %{_infodir}/*.info*

%files -n %{?cross}gcrypt
%{_oldprefix}/bin/%{?cross}dumpsexp
%{_oldprefix}/bin/%{?cross}hmac256
%{_oldprefix}/bin/%{?cross}mpicalc
%doc %{_mandir}/man1/%{?cross}hmac256.1*

%changelog

* Sat Nov 07 2020 Morgan Thomas <m@m0rg.dev> 1.8.7-2
  Remove the generated info directory (if present) before packaging.
