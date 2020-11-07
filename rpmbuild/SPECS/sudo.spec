Name:           sudo
Version:        1.9.3p1
Release:        1%{?dist}
Summary:        you know what sudo is

License:        ISC
URL:            https://www.sudo.ws/
%undefine       _disable_source_fetch
Source0:        https://www.sudo.ws/dist/sudo-%{version}.tar.gz
%define         SHA256SUM0 dcb9de53e45e1c39042074b847f5e0d8ae1890725dd6a9d9101a81569e6eb49e

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libpam-devel
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --with-secure-path \
           --with-env-editor \
           --with-passprompt="[sudo] password for %p: "
%make_build

%install
%make_install
%find_lang sudo
%find_lang sudoers

cat > %{buildroot}%{_sysconfdir}/sudoers.d/sudo << "EOF"
Defaults secure_path="/usr/bin:/bin:/usr/sbin:/sbin"
%wheel ALL=(ALL) ALL
EOF

%{__install} -dm755 %{buildroot}%{_sysconfdir}/pam.d
cat > %{buildroot}%{_sysconfdir}/pam.d/sudo << "EOF"
# Begin /etc/pam.d/sudo

# include the default auth settings
auth      include     system-auth

# include the default account settings
account   include     system-account

# Set default environment variables for the service user
session   required    pam_env.so

# include system session defaults
session   include     system-session

# End /etc/pam.d/sudo
EOF
chmod 644 %{buildroot}%{_sysconfdir}/pam.d/sudo

%files -f sudo.lang -f sudoers.lang
%{_bindir}/*
%{_sbindir}/*
%{_libexecdir}/sudo
%{_sysconfdir}/sudoers.d
%{_sysconfdir}/sudoers.dist
%{_sysconfdir}/pam.d/sudo
%exclude /run
%{_includedir}/sudo_plugin.h
%config %{_sysconfdir}/sudo.conf
%config %{_sysconfdir}/sudo_logsrvd.conf
%config(noreplace) %{_sysconfdir}/sudoers
%doc %{_mandir}/man{1,5,8}/*
%doc %{_docdir}/sudo

%changelog
