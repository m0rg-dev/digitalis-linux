Name:           make-ca
Version:        1.7
Release:        1%{?dist}
Summary:        PKI management utility

License:        MIT, GPLv3
URL:            https://github.com/djlucas/make-ca
%undefine       _disable_source_fetch
Source0:        https://github.com/djlucas/make-ca/releases/download/v%{version}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 6db8b96c961790507c5e36e0ed75a079ae95300f520cd88ac061cf44a4733c2f

BuildArch:      noarch

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  help2man
BuildRequires:  make

Requires:       /usr/bin/openssl

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%make_build

%install
%make_install

%{__install} -dm755 %{buildroot}%{_sysconfdir}/ssl/local

%files
%license LICENSE LICENSE.GPLv3
%{_sysconfdir}/make-ca.conf.dist
%exclude %{_prefix}/lib/systemd
%{_sbindir}/make-ca
%{_libexecdir}/make-ca

%doc %{_mandir}/man8/*
%dir %{_sysconfdir}/ssl/local

%changelog
