Name:           dhcpcd
Version:        9.3.2
Release:        3%{?dist}
Summary:        DHCP client and connection manager

License:        2-clause BSD
URL:            https://roy.marples.name/projects/dhcpcd/
%undefine       _disable_source_fetch
Source0:        https://roy.marples.name/downloads/dhcpcd/dhcpcd-%{version}.tar.xz
%define         SHA256SUM0 6d49af5e766a2515e6366e4f669663df04ecdf90a1a60ddb1d7a2feb4b5d2566

# X10-Update-Spec: { "type": "webscrape", "url": "https://roy.marples.name/downloads/dhcpcd/"}

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

%{__install} -dm755 %{buildroot}%{_sysconfdir}/init.d/
cat > %{buildroot}%{_sysconfdir}/init.d/dhcpcd <<EOF
#!/sbin/openrc-run
# Copyright 2007-2008 Roy Marples <roy@marples.name>
# All rights reserved. Released under the 2-clause BSD license.

command=/sbin/dhcpcd
pidfile=/var/run/dhcpcd.pid
command_args=-q
name="DHCP Client Daemon"

depend()
{
	provide net
	need localmount
	use logger network
	after bootmisc modules
	before dns
}
EOF
chmod 755 %{buildroot}%{_sysconfdir}/init.d/dhcpcd
%{__install} -dm755 %{buildroot}%{_localstatedir}/chroot/dhcpcd

%pre
# Create the 'dhcpcd' user if it doesn't exist
if [ -z "$(getent passwd dhcpcd)" ]; then
    # TODO this number doesn't mean anything
    useradd dhcpcd \
        --home-dir /var/chroot/dhcpcd \
        --uid 303 \
        --system
fi

%post
# Enable the OpenRC service if OpenRC is installed
if [ -x "$(command -v rc-update)" ]; then
    rc-update add dhcpcd default
fi

%preun
if [ "$1" = 0 ]; then
    if [ -x "$(command -v rc-update)" ]; then
        rc-update del dhcpcd default
    fi
fi

%postun
if [ "$1" = 0 ]; then
    userdel dhcpcd
    groupdel dhcpcd
fi


%files
%license LICENSE
%dir %{_localstatedir}/db/dhcpcd
%{_sbindir}/dhcpcd
%{_datadir}/dhcpcd/hooks
%{_libexecdir}/dhcpcd-hooks
%{_libexecdir}/dhcpcd-run-hooks
%{_sysconfdir}/init.d/dhcpcd
%attr(-, dhcpcd, dhcpcd) %{_localstatedir}/chroot/dhcpcd
%config(noreplace) %{_sysconfdir}/dhcpcd.conf
%doc %{_mandir}/man{5,8}/*

%changelog
* Sun Nov 08 2020 Morgan Thomas <m@m0rg.dev> 9.3.2-3
  Don't break the init script on reinstalls.

* Sun Nov 08 2020 Morgan Thomas <m@m0rg.dev> 9.3.2-2
  Add init script and privsep user.
