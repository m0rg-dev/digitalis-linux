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
%define _prefix /usr/%{_target}/
%endif

Name:           %{?cross}glibc
Version:        2.31
Release:        1%{?dist}
Summary:        The GNU C Library project provides the core libraries for the GNU system and GNU/Linux systems, as well as many other systems that use Linux as the kernel.

License:        LGPLv2+ and LGPLv2+ with exceptions and GPLv2+ and GPLv2+ with exceptions and BSD and Inner-Net and ISC and Public Domain and GFDL
URL:            https://www.gnu.org/software/libc/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/glibc/glibc-%{version}.tar.xz
%define         SHA256SUM0 9246fe44f68feeec8c666bb87973d590ce0137cca145df014c72ec95be9ffd17
Source1:        nscd.conf
Source2:        nsswitch.conf

BuildRequires:  make kernel-headers bison
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

BuildRequires: %{?target_tool_prefix}standalone-gcc %{?target_tool_prefix}binutils

%undefine _annotated_build
%global debug_package %{nil}

%description


%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
# stdlib.h depends on linux/errno.h
Requires:       %{?target_tool_prefix}kernel-headers

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
    --prefix= \
    --includedir=/usr/include \
    --enable-kernel=3.2 \
    --with-headers=/usr/include \
    --disable-werror \
    --enable-static-pie \
    libc_cv_slibdir=/lib \
    libc_cv_ctors_header=yes

%make_build

%install
rm -rf %{buildroot}
cd build
%if %{isnative}
%make_install
%else
%{__make} install DESTDIR=%{buildroot}/%{_prefix} INSTALL="%{__install} -p"
%endif

%if %{isnative}
# fedora is of the opinion that running this in parallel makes for a non-reproducible
# build, but it _also_ makes it take absolutely forever. if it turns out to be a problem
# I may try to patch the makefile instead
# though it does make one heck of a mess in the log output like this
#make %{?_smp_mflags} DESTDIR=%{buildroot} localedata/install-locales
# nscd.conf
install -m 644 %{SOURCE1} %{buildroot}/etc
# nsswitch.conf
install -m 644 %{SOURCE2} %{buildroot}/etc
install -d -m644 %{buildroot}/var/cache/nscd
%endif

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig


%files
%license COPYING COPYING.LIB LICENSES

%{_bindir}/*
%{_sbindir}/*
%{_prefix}/libexec/*
%{_prefix}/share/*
# can't use _libdir reliably from fedora
%{_prefix}/lib/gconv
%{_prefix}/lib/audit
%{_prefix}/lib/*.so.*

%if %{isnative}
/sbin/ldconfig
/sbin/sln
/var/db
%dir /var/cache/nscd

%config(noreplace) /etc/rpc
%config(noreplace) /etc/nscd.conf
%config(noreplace) /etc/nsswitch.conf
%else
%exclude %{_prefix}/etc
%exclude %{_prefix}/var
%endif

#%doc add-main-docs-here

%files devel
#%doc add-devel-docs-here
%{_prefix}/usr/include*
%{_prefix}/lib/*.so
%{_prefix}/lib/*.a
%{_prefix}/lib/*.o

%changelog
