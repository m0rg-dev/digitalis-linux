Name:           iptables
Version:        1.8.6
Release:        2%{?dist}
Summary:        Legacy network packet filter / firewall

License:        GPLv2
URL:            https://www.netfilter.org/
%undefine       _disable_source_fetch
Source0:        https://www.netfilter.org/pub/iptables/iptables-%{version}.tar.bz2
%define         SHA256SUM0 a0f4fe0c3eb8faa5bd9c8376d132f340b9558e750c91deb2d5028aa3d0047767

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libmnl-devel
BuildRequires:  %{?host_tool_prefix}libnftnl-devel
BuildRequires:  make

Requires:       nftables

%undefine _annotated_build

%description

%package     -n libiptc
Summary:        libiptc from iptables
License:        GPLv2
URL:            https://www.netfilter.org/
%description -n libiptc

%package     -n libiptc-devel
Summary:        Development files for libiptc
Requires:       libiptc = %{version}-%{release}
%description -n libiptc-devel

%package     -n libxtables
Summary:        libxtables from iptables
License:        GPLv2
URL:            https://www.netfilter.org/
%description -n libxtables

%package     -n libxtables-devel
Summary:        Development files for libxtables
Requires:       libxtables = %{version}-%{release}
%description -n libxtables-devel

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib
%make_build

%install
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_bindir}/iptables-xml
%{_sbindir}/arptables
%{_sbindir}/arptables-nft
%{_sbindir}/arptables-nft-restore
%{_sbindir}/arptables-nft-save
%{_sbindir}/arptables-restore
%{_sbindir}/arptables-save
%{_sbindir}/ebtables
%{_sbindir}/ebtables-nft
%{_sbindir}/ebtables-nft-restore
%{_sbindir}/ebtables-nft-save
%{_sbindir}/ebtables-restore
%{_sbindir}/ebtables-save
%{_sbindir}/ip6tables
%{_sbindir}/ip6tables-apply
%{_sbindir}/ip6tables-legacy
%{_sbindir}/ip6tables-legacy-restore
%{_sbindir}/ip6tables-legacy-save
%{_sbindir}/ip6tables-nft
%{_sbindir}/ip6tables-nft-restore
%{_sbindir}/ip6tables-nft-save
%{_sbindir}/ip6tables-restore
%{_sbindir}/ip6tables-restore-translate
%{_sbindir}/ip6tables-save
%{_sbindir}/ip6tables-translate
%{_sbindir}/iptables
%{_sbindir}/iptables-apply
%{_sbindir}/iptables-legacy
%{_sbindir}/iptables-legacy-restore
%{_sbindir}/iptables-legacy-save
%{_sbindir}/iptables-nft
%{_sbindir}/iptables-nft-restore
%{_sbindir}/iptables-nft-save
%{_sbindir}/iptables-restore
%{_sbindir}/iptables-restore-translate
%{_sbindir}/iptables-save
%{_sbindir}/iptables-translate
%{_sbindir}/xtables-legacy-multi
%{_sbindir}/xtables-monitor
%{_sbindir}/xtables-nft-multi
%{_sysconfdir}/ethertypes
%doc %{_mandir}/man{1,8}/*

%files -n libiptc
%{_prefix}/lib/libip4tc.so.*
%{_prefix}/lib/libip6tc.so.*

%files -n libiptc-devel
%{_includedir}/libiptc
%{_prefix}/lib/libip4tc.so
%{_prefix}/lib/libip6tc.so
%{_prefix}/lib/pkgconfig/libiptc.pc
%{_prefix}/lib/pkgconfig/libip4tc.pc
%{_prefix}/lib/pkgconfig/libip6tc.pc

%files -n libxtables
%{_prefix}/lib/xtables
%{_prefix}/lib/libxtables.so.*

%files -n libxtables-devel
%{_includedir}/xtables*
%{_prefix}/lib/libxtables.so
%{_prefix}/lib/pkgconfig/xtables.pc

%changelog
