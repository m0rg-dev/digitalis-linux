Name:           openssh
Version:        8.4p1
Release:        4%{?dist}
Summary:        SSH client and server

License:        3-clause BSD
URL:            https://www.openssh.com
%undefine       _disable_source_fetch
Source0:        https://cdn.openbsd.org/pub/OpenBSD/OpenSSH/portable/openssh-%{version}.tar.gz
%define         SHA256SUM0 5a01d22e407eb1c05ba8a8f7c654d388a13e9f226e4ed33bd38748dafa1d2b24

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libopenssl-devel
BuildRequires:  %{?host_tool_prefix}libpam-devel
BuildRequires:  %{?host_tool_prefix}zlib-devel
BuildRequires:  make

%undefine _annotated_build
%define debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --with-pam --with-ssl-dir=/etc/ssl
%make_build

%install
%make_install

mv %{buildroot}%{_mandir}/{cat,man}1
mv %{buildroot}%{_mandir}/{cat,man}5
mv %{buildroot}%{_mandir}/{cat,man}8

%{__install} -dm755 %{buildroot}%{_sysconfdir}/init.d/
cat > %{buildroot}%{_sysconfdir}/init.d/sshd <<EOF
#!/sbin/openrc-run

command=/sbin/sshd
pidfile=/var/run/sshd.pid
command_args="-o PidFile=/var/run/sshd.pid"
name="OpenSSH Server"

start_pre() {
    ssh-keygen -A
}
EOF
chmod 755 %{buildroot}%{_sysconfdir}/init.d/sshd

%pre
# Create the 'sshd' user if it doesn't exist
if [ -z "$(getent passwd sshd)" ]; then
    # TODO this number doesn't mean anything
    useradd sshd \
        --home-dir %{_localstatedir}/empty \
        --uid 22 \
        --system
fi


%postun
if [ "$1" = 0 ]; then
    userdel sshd
fi

%files
%license LICENCE
%{_bindir}/*
%{_sbindir}/sshd
%{_libexecdir}/*
%{_sysconfdir}/moduli
%{_sysconfdir}/init.d/sshd
%attr(0755, root, root) %dir %{_localstatedir}/empty
%config(noreplace) %{_sysconfdir}/ssh_config
%config(noreplace) %{_sysconfdir}/sshd_config
%doc %{_mandir}/man{1,5,8}/*

%changelog
