%define system_python 3.9

Name:           nftables
Version:        0.9.7
Release:        2%{?dist}
Summary:        Network filter and firewall tools

License:        GPLv2
URL:            https://www.netfilter.org/projects/nftables/index.html
%undefine       _disable_source_fetch
Source0:        https://www.netfilter.org/projects/nftables/files/nftables-%{version}.tar.bz2
%define         SHA256SUM0 fe6b8a8c326a2c09c02ca162b840d7d4aadb043ce7a367c166d6455b0e112cb0

# X10-Update-Spec: { "type": "webscrape", "url": "https://www.netfilter.org/projects/nftables/files/", "pattern": "(?:href=\"|/)\\w+-((?:\\d+\\.){2}\\d+)\\.tar\\..z2?\""}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libmnl-devel
BuildRequires:  %{?host_tool_prefix}libnftnl-devel
BuildRequires:  %{?host_tool_prefix}libgmp-devel
BuildRequires:  %{?host_tool_prefix}libreadline-devel
BuildRequires:  make

BuildRequires:  python%{system_python}
Requires:       python%{system_python}

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib --disable-static
%make_build

%install
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_sbindir}/nft
%{_sysconfdir}/nftables
# TODO subpackages
%{_includedir}/*
%{_prefix}/lib/libnftables.so*
%{_prefix}/lib/pkgconfig/libnftables.pc
%{_prefix}/lib/python%{system_python}/site-packages/nftables*

%doc %{_mandir}/man{3,5,8}/*
%doc %{_docdir}/nftables

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 0.9.7 release 2
  Updated to Python 3.9
