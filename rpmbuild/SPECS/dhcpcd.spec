Name:           dhcpcd
Version:        9.3.2
Release:        1%{?dist}
Summary:        DHCP client and connection manager

License:        2-clause BSD
URL:            https://roy.marples.name/projects/dhcpcd/
%undefine       _disable_source_fetch
Source0:        https://roy.marples.name/downloads/dhcpcd/dhcpcd-%{version}.tar.xz
%define         SHA256SUM0 6d49af5e766a2515e6366e4f669663df04ecdf90a1a60ddb1d7a2feb4b5d2566

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure CC=%{?host_tool_prefix}gcc
%make_build

%install
%make_install

%files
%license LICENSE
%dir %{_localstatedir}/db/dhcpcd
%{_sbindir}/dhcpcd
%{_datadir}/dhcpcd/hooks
%{_libexecdir}/dhcpcd-hooks
%{_libexecdir}/dhcpcd-run-hooks
%config(noreplace) %{_sysconfdir}/dhcpcd.conf
%doc %{_mandir}/man{5,8}/*

%changelog
