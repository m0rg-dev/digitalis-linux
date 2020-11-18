Name:           lvm2
Version:        2.03.10
Release:        1%{?dist}
Summary:        Logical Volume Manager

License:        GPLv2, LGPLv2
URL:            https://sourceware.org/lvm2/
%undefine       _disable_source_fetch
Source0:        https://mirrors.kernel.org/sourceware/lvm2/releases/LVM2.%{version}.tgz
%define         SHA256SUM0 5ad1645a480440892e35f31616682acba0dc204ed049635d2df3e5a5929d0ed0

# X10-Update-Spec: { "type": "webscrape", 
# X10-Update-Spec:   "url": "https://mirrors.kernel.org/sourceware/lvm2/releases/",
# X10-Update-Spec:   "pattern": "(?:href=\"|/)LVM2\\.((?:\\d+\\.)*\\d+)\\.tgz\""}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  %{?host_tool_prefix}libudev-devel
BuildRequires:  %{?host_tool_prefix}libuuid-devel
BuildRequires:  %{?host_tool_prefix}libblkid-devel
BuildRequires:  %{?host_tool_prefix}libaio-devel
BuildRequires:  make

%undefine _annotated_build

%description

%package     -n %{?cross}libdevice-mapper
Summary:        Device Mapper userspace library
License:        GPLv2, LGPLv2
URL:            https://sourceware.org/lvm2/
%description -n %{?cross}libdevice-mapper

%package     -n %{?cross}libdevice-mapper-devel
Summary:        Development files for libdevice-mapper
Requires:       %{?cross}libdevice-mapper = %{version}-%{release}
Requires:       %{?cross}libudev-devel
%description -n %{?cross}libdevice-mapper-devel

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n LVM2.%{version}
sed -i 's|@BLKID_LIBS@|-lblkid -luuid|g' make.tmpl.in

%build
%configure --disable-selinux --disable-readline --enable-pkgconfig \
    --enable-fsadm --enable-applib --enable-dmeventd --enable-cmdlib \
    --enable-udev_sync --enable-udev_rules --enable-lvmetad \
    --with-udevdir=/usr/lib/udev/rules.d --with-default-pid-dir=/run \
    --with-default-dm-run-dir=/run --with-default-run-dir=/run/lvm \
    --with-default-locking-dir=/run/lock/lvm \
    --libdir=%{_prefix}/lib \
    ac_cv_func_malloc_0_nonnull=yes \
    ac_cv_func_realloc_0_nonnull=yes

%make_build

%install
%make_install

sed -i 's,use_lvmetad = 1,use_lvmetad = 0,' %{buildroot}/etc/lvm/lvm.conf

%files
%license COPYING
%{_sbindir}/*
%config %{_sysconfdir}/lvm
%doc %{_mandir}/man5/*
%doc %{_mandir}/man7/*
%doc %{_mandir}/man8/lv*
%doc %{_mandir}/man8/fsadm*
%doc %{_mandir}/man8/blkdeactivate*
%doc %{_mandir}/man8/pv*
%doc %{_mandir}/man8/vg*

%files -n %{?cross}libdevice-mapper
%license COPYING
%{_prefix}/lib/libdevmapper*.so.*
%{_prefix}/lib/liblvm2cmd.so.*
%{_prefix}/lib/libdevmapper-event-lvm2?*.so
%{_prefix}/lib/device-mapper
%{_prefix}/lib/udev/rules.d/*
%doc %{_mandir}/man8/dm*

%files -n %{?cross}libdevice-mapper-devel
%{_prefix}/lib/pkgconfig/devmapper*.pc
%{_includedir}/libdevmapper*.h
%{_includedir}/lvm2cmd.h
%{_prefix}/lib/liblvm2cmd.so
%{_prefix}/lib/libdevmapper.so
%{_prefix}/lib/libdevmapper-event.so
%{_prefix}/lib/libdevmapper-event-lvm2.so

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 2.03.10 release 1
  Updated to version 2.03.10.
