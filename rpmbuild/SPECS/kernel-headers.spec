# yes, you can have cross-linux-headers! it just has to do with where they
# get installed - if we're building cross headers we want to stick 'em in the
# cross buildroot.

# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

Name:           %{?cross}kernel-headers
Version:        5.9.9
Release:        1%{?dist}
Summary:        Development files for the Linux kernel.
License:        GPLv2 with exceptions
URL:            https://www.kernel.org
%undefine       _disable_source_fetch
Source0:        https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-%{version}.tar.xz
%define         SHA256SUM0 a302d386af1278e7a8c0c2cd9a3b2119a18620eccc1f069b0f23e405bcf61fad
BuildArch:      noarch

# X10-Update-Spec: { "type": "webscrape", 
# X10-Update-Spec:   "url": "https://www.kernel.org",
# X10-Update-Spec:   "pattern": "latest_link\">\\s*<a href=\"https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-((?:\\d+\\.?)+)\\." }

BuildRequires:  make gcc

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n linux-%{version}
make mrproper

%build
make headers

%install
find usr/include -name '.*' -delete
rm usr/include/Makefile
install -dm755 %{buildroot}/%{_prefix}/
cp -rv usr/include %{buildroot}/%{_prefix}/

%files
%license COPYING
%{_includedir}/asm
%{_includedir}/asm-generic
%{_includedir}/drm
%{_includedir}/linux
%{_includedir}/misc
%{_includedir}/mtd
%{_includedir}/rdma
%{_includedir}/scsi
%{_includedir}/sound
%{_includedir}/video
%{_includedir}/xen

%changelog
 
* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 5.9.9-1
  Updated to version 5.9.9.
  
- 2020-11-04 Morgan Thomas <m@m0rg.dev>
  Updated to version 5.9.3.
