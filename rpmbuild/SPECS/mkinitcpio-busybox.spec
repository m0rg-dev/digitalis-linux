Name:           mkinitcpio-busybox
Version:        1.32.0
Release:        1%{?dist}
Summary:        busybox for use in initramfs

License:        GPLv2
URL:            https://busybox.net/
%undefine       _disable_source_fetch
Source0:        https://busybox.net/downloads/busybox-%{version}.tar.bz2
%define         SHA256SUM0 c35d87f1d04b2b153d33c275c2632e40d388a88f19a9e71727e0bbbff51fe689

# X10-Update-Spec: { "type": "webscrape", "url": "https://busybox.net/downloads/"}

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

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 1.32.0 release 1
  Updated to version 1.32.0.
