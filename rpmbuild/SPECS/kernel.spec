Name:           kernel
Version:        5.9.3
Release:        6%{?dist}
Summary:        The Linux kernel

License:        GPLv2 with exceptions
URL:            https://www.kernel.org
%undefine       _disable_source_fetch
Source0:        https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-%{version}.tar.xz
%define         SHA256SUM0 d1ae28dfe9d25b73f2e437319df1b77d7ac1d0efd188cfb5df84a6784a318a73

Source1:        linux-01-config
Source2:        linux-02-modprobe-usb-conf
Source3:        linux-03-mkinitcpio-linux

# https://src.fedoraproject.org/rpms/kernel/raw/94a4277f8827d1b2c911deabe56e7d929dc93146/f/kernel-x86_64-fedora.config.
Source4:        linux-04-fedora-base-config

BuildRequires:  elfutils
BuildRequires:  libopenssl-devel
BuildRequires:  kmod
BuildRequires:  cpio
BuildRequires:  flex
BuildRequires:  bison
BuildRequires:  make
BuildRequires:  gcc
BuildRequires:  bc
BuildRequires:  zlib-devel
BuildRequires:  zstd

Requires:       kmod
Requires:       mkinitcpio
Requires:       util-linux

Requires(post): mkinitcpio

%global debug_package %{nil}

%if "%{_build}" != "%{_target}"
# someday...
%error "This package is not set up for cross-compilation"
%endif

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n linux-%{version}

%build
perl -p -i -e "s/^EXTRAVERSION.*/EXTRAVERSION = -%{release}/" Makefile
%{__make} mrproper
cp %SOURCE4 .config
./scripts/kconfig/merge_config.sh -m -r .config %SOURCE1

%{__make} olddefconfig
%make_build

%install
%{__make} %{?_smp_mflags} INSTALL_MOD_PATH=%{buildroot} INSTALL_MOD_STRIP=1 KERNELRELEASE=%{version}-%{release} modules_install mod-fw=

%{__install} -dm755 %{buildroot}/boot
cp -iv arch/$(uname -m)/boot/bzImage %{buildroot}/boot/vmlinuz-%{version}-%{release}
cp -iv .config %{buildroot}/boot/config-%{version}-%{release}

%{__install} -dm755 %{buildroot}%{_docdir}/linux-%{version}-%{release}
cp -r Documentation/* %{buildroot}/%{_docdir}/linux-%{version}-%{release}

%{__install} -dm755 %{buildroot}%{_sysconfdir}/modprobe.d
%{__install} %SOURCE2 %{buildroot}%{_sysconfdir}/modprobe.d/usb.conf

%{__install} -dm755 %{buildroot}%{_sysconfdir}/mkinitcpio.d
%{__install} %SOURCE3 %{buildroot}%{_sysconfdir}/mkinitcpio.d/kernel-%{version}-%{release}.preset

sed -i 's|%%{version}|%{version}-%{release}|' %{buildroot}%{_sysconfdir}/mkinitcpio.d/kernel-%{version}-%{release}.preset

%post
mkinitcpio -p kernel-%{version}-%{release} -k %{version}-%{release}

%files
%license COPYING LICENSES/preferred/GPL-2.0 LICENSES/exceptions/Linux-syscall-note
%doc %{_docdir}/linux-%{version}-%{release}
/lib/modules/%{version}-%{release}
/boot/vmlinuz-%{version}-%{release}
/boot/config-%{version}-%{release}
%{_sysconfdir}/modprobe.d/usb.conf
%{_sysconfdir}/mkinitcpio.d/kernel-%{version}-%{release}.preset

%changelog
- 2020-11-17 Morgan Thomas <m@m0rg.dev> 5.9.3 release 6
  Use a base config from Fedora instead of the previous config of unknown origin.

- 2020-11-06 Morgan Thomas <m@m0rg.dev> 5.9.3 release 5
  Added CONFIG_IP_NF_NAT=m to config.

- 2020-11-06 Morgan Thomas <m@m0rg.dev> 5.9.3 release 4
  Correctly set the kernel version for module loading.

- 2020-11-06 Morgan Thomas <m@m0rg.dev> 5.9.3 release 3
  Set up the mkinitcpio hook to take release into account.

- 2020-11-06 Morgan Thomas <m@m0rg.dev> 5.9.3 release 2
  Added CONFIG_OVERLAY_FS=m to config.