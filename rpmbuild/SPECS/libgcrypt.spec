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

%define libname libgcrypt

Name:           %{?cross}%{libname}
Version:        1.8.7
Release:        1%{?dist}
Summary:        Libgcrypt is a general purpose cryptographic library originally based on code from GnuPG.

License:        LGPLv2+
URL:            https://gnupg.org/software/libgcrypt/index.html
%undefine       _disable_source_fetch
Source0:        https://gnupg.org/ftp/gcrypt/%{libname}/%{libname}-%{version}.tar.bz2
%define         SHA256SUM0 03b70f028299561b7034b8966d7dd77ef16ed139c43440925fe8782561974748

BuildRequires:  make gcc

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}glibc-devel
BuildRequires: %{?target_tool_prefix}libgpg-error-devel

Requires:      %{?target_tool_prefix}libgpg-error

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?target_tool_prefix}libgpg-error-devel

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
%configure \
%if ! %{isnative}
    --with-libgpg-error-prefix=%{_prefix} \
    --disable-asm \
%endif
    --host=%{_target} --libdir=%{_prefix}/lib
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig


%files
%license COPYING COPYING.LIB
%{_bindir}/*
%{_prefix}/lib/*.so.*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/hmac256.1

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_datadir}/aclocal/*.m4
%{_prefix}/lib/pkgconfig/*.pc

%changelog

