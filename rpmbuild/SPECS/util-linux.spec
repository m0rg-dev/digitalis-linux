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

%define libname util-linux

Name:           %{?cross}%{libname}
Version:        2.36
Release:        1%{?dist}
Summary:        Various utility programs.

License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
%undefine       _disable_source_fetch
Source0:        https://mirrors.edge.kernel.org/pub/linux/utils/%{libname}/v%{version}/%{libname}-%{version}.tar.xz
%define         SHA256SUM0 9e4b1c67eb13b9b67feb32ae1dc0d50e08ce9e5d82e1cccd0ee771ad2fa9e0b1

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

%package     -n %{?cross}libsmartcols
Summary:        libsmartcols from util-linux
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
%description -n %{?cross}libsmartcols

%package     -n %{?cross}libsmartcols-devel
Summary:        Development files for libsmartcols
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
Requires:       %{?cross}libsmartcols = %{version}-%{release}
%description -n %{?cross}libsmartcols-devel

%package     -n %{?cross}libfdisk
Summary:        libfdisk from util-linux
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
%description -n %{?cross}libfdisk

%package     -n %{?cross}libfdisk-devel
Summary:        Development files for libfdisk
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
Requires:       %{?cross}libfdisk = %{version}-%{release}
%description -n %{?cross}libfdisk-devel

%package     -n %{?cross}libmount
Summary:        libmount from util-linux
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
%description -n %{?cross}libmount

%package     -n %{?cross}libmount-devel
Summary:        Development files for libmount
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
Requires:       %{?cross}libmount = %{version}-%{release}
%description -n %{?cross}libmount-devel

%package     -n %{?cross}libuuid
Summary:        libuuid from util-linux
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
%description -n %{?cross}libuuid

%package     -n %{?cross}libuuid-devel
Summary:        Development files for libuuid
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
Requires:       %{?cross}libuuid = %{version}-%{release}
%description -n %{?cross}libuuid-devel

%package     -n %{?cross}libblkid
Summary:        libblkid from util-linux
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
%description -n %{?cross}libblkid

%package     -n %{?cross}libblkid-devel
Summary:        Development files for libblkid
License:        GPLv2+, LGPLv2+, BSD
URL:            https://mirrors.edge.kernel.org/pub/linux/utils/util-linux/
Requires:       %{?cross}libblkid = %{version}-%{release}
%description -n %{?cross}libblkid-devel

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

mkdir build
cd build
%define _configure ../configure
%configure --host=%{_target} --libdir=%{_prefix}/lib \
    ADJTIME_PATH=/var/lib/hwclock/adjtime   \
                --disable-chfn-chsh  \
                --disable-login      \
                --disable-nologin    \
                --disable-su         \
                --disable-setpriv    \
                --disable-runuser    \
                --disable-pylibmount \
                --disable-static     \
                --without-python     \
                --without-systemd    \
                --without-systemdsystemunitdir
%make_build

%install
cd build
%make_install
%find_lang util-linux

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files -f build/util-linux.lang
%license COPYING README.licensing
%{_bindir}/*
%{_sbindir}/*
%{_datadir}/bash-completion/completions/*
%doc %{_datadir}/doc/util-linux
%doc %{_mandir}/man{1,5,8}/*

%files -n %{?cross}libfdisk
%license COPYING README.licensing
%{_prefix}/lib/libfdisk.so.*

%files -n %{?cross}libfdisk-devel
%{_prefix}/lib/libfdisk.so
%{_prefix}/lib/pkgconfig/fdisk.pc
%{_includedir}/libfdisk

%files -n %{?cross}libsmartcols
%license COPYING README.licensing
%{_prefix}/lib/libsmartcols.so.*

%files -n %{?cross}libsmartcols-devel
%{_prefix}/lib/libsmartcols.so
%{_prefix}/lib/pkgconfig/smartcols.pc
%{_includedir}/libsmartcols

%files -n %{?cross}libmount
%license COPYING README.licensing
%{_prefix}/lib/libmount.so.*

%files -n %{?cross}libmount-devel
%{_prefix}/lib/libmount.so
%{_prefix}/lib/pkgconfig/mount.pc
%{_includedir}/libmount

%files -n %{?cross}libuuid
%license COPYING README.licensing
%{_prefix}/lib/libuuid.so.*

%files -n %{?cross}libuuid-devel
%{_prefix}/lib/libuuid.so
%{_prefix}/lib/pkgconfig/uuid.pc
%{_includedir}/uuid
%doc %{_mandir}/man3/uuid*

%files -n %{?cross}libblkid
%license COPYING README.licensing
%{_prefix}/lib/libblkid.so.*

%files -n %{?cross}libblkid-devel
%{_prefix}/lib/libblkid.so
%{_prefix}/lib/pkgconfig/blkid.pc
%{_includedir}/blkid
%{_mandir}/man3/libblkid.3

%changelog

