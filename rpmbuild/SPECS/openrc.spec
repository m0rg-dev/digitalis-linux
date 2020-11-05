Name:           openrc
Version:        0.42.1
Release:        1%{?dist}
Summary:        A dependency-based init system

License:        2-clause BSD
URL:            https://github.com/OpenRC/openrc
%undefine       _disable_source_fetch
Source0:        https://github.com/OpenRC/openrc/archive/%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 91a01ca6d930a0688fb91338209985de57cac7aa2d37feddacb78fd3d95308e2

%if "%{_build}" != "%{_target}"
%error "This package does not currently cross-compile"
%endif

BuildRequires:  gcc
BuildRequires:  make
Requires:       libeinfo%{?_isa} = %{version}-%{release}
Requires:       librc%{?_isa} = %{version}-%{release}

Provides:       /sbin/openrc-run

%undefine _annotated_build

%description

%package     -n libeinfo
Summary:        Support library for openrc
License:        GPLv2+

%description -n libeinfo

%package     -n libeinfo-devel
Summary:        Development files for libeinfo
Requires:       libeinfo%{?_isa} = %{version}-%{release}

%description -n libeinfo-devel
The libeinfo-devel package contains libraries and header files for
developing applications that use libeinfo.

%package     -n librc
Summary:        Support library for openrc
License:        GPLv2+

%description -n librc

%package     -n librc-devel
Summary:        Development files for librc
Requires:       librc%{?_isa} = %{version}-%{release}

%description -n librc-devel
The librc-devel package contains libraries and header files for
developing applications that use librc.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
# TODO
ln -s gcc /usr/bin/cc

# TODO remove -fcommon after next OpenRC release
sed -i 's/-Wall/-fcommon -Wall/' mk/cc.mk

BRANDING="Digitalis" %make_build \
    LIBNAME=lib \
    MKBASHCOMP=yes \
    MKZSHCOMP=yes \
    SH=/usr/bin/sh \
    MKSTATICLIBS=no \
    OS=Linux \
    PREFIX=/%{_prefix} \
    SYSCONFDIR=%{_sysconfdir} \
    MKSYSVINIT=yes

%install
%make_install

install -dm755 %{buildroot}%{_bindir}
install -dm755 %{buildroot}%{_sbindir}

ln -sfv openrc-init %{buildroot}%{_sbindir}/init
ln -sfv openrc-shutdown %{buildroot}%{_sbindir}/shutdown
for tty in tty{1..7}; do
    ln -sfv agetty %{buildroot}%{_sysconfdir}/init.d/agetty.$tty
    ln -sfv /etc/init.d/agetty.$tty %{buildroot}%{_sysconfdir}/runlevels/default
done

mv %{buildroot}/bin/* %{buildroot}%{_bindir}
mv %{buildroot}/sbin/* %{buildroot}%{_sbindir}
mv %{buildroot}/lib/* %{buildroot}%{_prefix}/lib

find %{buildroot} -name '*.so.*' -exec chmod +x {} ';'

find %{buildroot} -name '*.a' -exec rm -f {} ';'

%files
%license LICENSE
%{_sysconfdir}/init.d/*
%{_sysconfdir}/local.d/README
%{_sysconfdir}/sysctl.d/README
%{_sysconfdir}/runlevels
/libexec/rc

%{_sbindir}/*
%{_bindir}/*

%{_datadir}/openrc

%dir %{_sysconfdir}/local.d
%dir %{_sysconfdir}/sysctl.d
%config(noreplace) %{_sysconfdir}/conf.d/*
%config(noreplace) %{_sysconfdir}/rc.conf
%doc %{_mandir}/man8/*

%files -n libeinfo
%{_prefix}/lib/libeinfo.so.*

%files -n libeinfo-devel
%{_includedir}/einfo.h
%{_prefix}/lib/libeinfo.so
%{_prefix}/lib/pkgconfig/einfo.pc
%doc %{_mandir}/man3/e*

%files -n librc
%{_prefix}/lib/librc.so.*

%files -n librc-devel
%{_includedir}/rc.h
%{_prefix}/lib/librc.so
%{_prefix}/lib/pkgconfig/openrc.pc
%doc %{_mandir}/man3/rc_*

%changelog
