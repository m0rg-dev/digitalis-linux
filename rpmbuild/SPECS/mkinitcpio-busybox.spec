Name:           mkinitcpio-busybox
Version:        1.31.1
Release:        1%{?dist}
Summary:        busybox for use in initramfs

License:        GPLv2
URL:            https://busybox.net/
%undefine       _disable_source_fetch
Source0:        https://busybox.net/downloads/busybox-%{version}.tar.bz2
%define         SHA256SUM0 d0f940a72f648943c1f2211e0e3117387c31d765137d92bd8284a3fb9752a998

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

%undefine _annotated_build
%define debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n busybox-%{version}
CARCH=$(uname -m)
safeflags="-march=${CARCH/_/-} -mtune=generic -Os -pipe -fno-strict-aliasing"
make defconfig
sed -i 's|^\(CONFIG_EXTRA_CFLAGS\)=.*|\1="'"$safeflags"'"|' .config
sed -i 's/CONFIG_DATE=y/CONFIG_DATE=n/' .config
sed -i 's/CONFIG_RDATE=y/CONFIG_RDATE=n/' .config

%build
%make_build

%install

%{__install} -dm755 %{buildroot}%{_prefix}/lib/initcpio
%{__install} -m755 busybox %{buildroot}%{_prefix}/lib/initcpio/

%files
%license LICENSE
%{_prefix}/lib/initcpio

%changelog
