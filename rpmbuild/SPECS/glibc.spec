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
%define _prefix /usr/%{_target}/%{_oldprefix}
%endif

Name:           %{?cross}glibc
Version:        2.32
Release:        2%{?dist}
Summary:        The GNU C Library project provides the core libraries for the GNU system and GNU/Linux systems, as well as many other systems that use Linux as the kernel.

License:        LGPLv2+ and LGPLv2+ with exceptions and GPLv2+ and GPLv2+ with exceptions and BSD and Inner-Net and ISC and Public Domain and GFDL
URL:            https://www.gnu.org/software/libc/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/glibc/glibc-%{version}.tar.xz
%define         SHA256SUM0 1627ea54f5a1a8467032563393e0901077626dc66f37f10ee6363bb722222836
Source1:        nscd.conf
Source2:        nsswitch.conf

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/glibc/"}

BuildRequires:  make bison
#Requires:       
Provides:       rtld(GNU_HASH)

# We need some host tools. If build == host, we can use non-prefixed versions; otherwise,
# we need prefixed host tools.
%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif

# If we are doing a fully native build, we can use the "full" gcc.
%if "%{_build}" == "%{_target}"
BuildRequires: gcc
%else
BuildRequires: %{?target_tool_prefix}standalone-gcc
%endif
BuildRequires: %{?target_tool_prefix}binutils
BuildRequires: %{?target_tool_prefix}kernel-headers

%undefine _annotated_build
%if ! %{isnative}
%global debug_package %{nil}
%endif

%description


%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
# stdlib.h depends on linux/errno.h
Requires:       %{?cross}kernel-headers

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n glibc-%{version}

%build
mkdir build
cd build

%define _configure ../configure

# glibc doesn't build with _FORTIFY_SOURCE apparently
%global optflags %(echo %{optflags} | sed 's/-Wp,-D_FORTIFY_SOURCE=2//')

%{_configure} \
    --host=%{_target} \
    --prefix=%{_oldprefix} \
    --libdir=/lib \
    --enable-kernel=3.2 \
%if "%{_build}" != "%{_target}"
    --with-headers=/usr/%{_target}/usr/include \
%endif
    --disable-werror \
    --enable-shared \
    libc_cv_slibdir=/lib
%make_build

%install
rm -rf %{buildroot}
cd build
%if %{isnative}
%make_install
%else
%{__make} install DESTDIR=%{buildroot}/usr/%{_target}/ INSTALL="%{__install} -p"
%endif

%if %{isnative}
# fedora is of the opinion that running this in parallel makes for a non-reproducible
# build, but it _also_ makes it take absolutely forever. if it turns out to be a problem
# I may try to patch the makefile instead
# though it does make one heck of a mess in the log output like this
make %{?_smp_mflags} DESTDIR=%{buildroot} localedata/install-locales
# nscd.conf
install -m 644 %{SOURCE1} %{buildroot}/etc
# nsswitch.conf
install -m 644 %{SOURCE2} %{buildroot}/etc
install -d -m644 %{buildroot}/var/cache/nscd

%endif

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%if %{isnative}
%transfiletriggerin -- /usr/lib /lib
/sbin/ldconfig -X

%transfiletriggerun -- /usr/lib /lib
/sbin/ldconfig -X

%endif

%files
%license COPYING COPYING.LIB LICENSES

%{_prefix}/libexec/*
%{_prefix}/share/*
# can't use _libdir reliably from fedora

%if %{isnative}
/lib/*.so*
%{_bindir}/*
%{_sbindir}/iconvconfig
%{_sbindir}/nscd
%{_sbindir}/zdump
%{_sbindir}/zic
/lib/gconv
/lib/audit
/lib/locale/locale-archive
/sbin/ldconfig
/sbin/sln
/var/db
%dir /var/cache/nscd

%config(noreplace) /etc/rpc
%config(noreplace) /etc/nscd.conf
%config(noreplace) /etc/nsswitch.conf
%else
/usr/%{_target}/lib/*.so.*
%exclude /usr/%{_target}/{etc,var}
%exclude %{_bindir}
%exclude %{_sbindir}
%exclude /usr/%{_target}/sbin/*

/usr/%{_target}/lib/gconv
/usr/%{_target}/lib/audit
%endif

#%doc add-main-docs-here

%files devel
#%doc add-devel-docs-here
%{_includedir}/*
%if %{isnative}
/lib/*.a
/lib/*.o
%else
/usr/%{_target}/lib/*.so
/usr/%{_target}/lib/*.a
/usr/%{_target}/lib/*.o
%endif

%changelog

- 2020-11-09 Morgan Thomas <m@m0rg.dev> 2.32 release 2
  Turn locale generation back on.

- 2020-11-08 Morgan Thomas <m@m0rg.dev> 2.32
  Update to version 2.32.
