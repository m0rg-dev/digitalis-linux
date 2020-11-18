Name:           iproute2
Version:        5.9.0
Release:        1%{?dist}
Summary:        Basic networking utilities

License:        GPLv2+
URL:            https://wiki.linuxfoundation.org/networking/iproute2
%undefine       _disable_source_fetch
Source0:        https://mirrors.edge.kernel.org/pub/linux/utils/net/iproute2/iproute2-%{version}.tar.xz
%define         SHA256SUM0 a25dac94bcdcf2f73316c7f812115ea7a5710580bad892b08a83d00c6b33dacf

# X10-Update-Spec: { "type": "webscrape", "url": "https://mirrors.edge.kernel.org/pub/linux/utils/net/iproute2/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  make
BuildRequires:  bison
BuildRequires:  flex
BuildRequires:  gcc

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
export CC=%{?host_tool_prefix}gcc
export AR=%{?host_tool_prefix}ar
export PKG_CONFIG={%host_tool_prefix}pkg-config
%configure
%make_build

%install
%make_install

mv %{buildroot}/sbin %{buildroot}%{_prefix}/

%files
%license COPYING
%{_sbindir}/*
%{_prefix}/lib/tc
%{_includedir}/iproute2
%{_datadir}/bash-completion/completions/*
%{_sysconfdir}/iproute2
%doc %{_mandir}/man{3,5,7,8}/*

%changelog
