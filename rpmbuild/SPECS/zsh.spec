Name:           zsh
Version:        5.8
Release:        1%{?dist}
Summary:        The Z shell

License:        MIT, GPLv3+
URL:            https://www.zsh.org/
%undefine       _disable_source_fetch
Source0:        https://www.zsh.org/pub/zsh-%{version}.tar.xz
%define         SHA256SUM0 dcc4b54cc5565670a65581760261c163d720991f0d06486da61f8d839b52de27
Source1:        https://www.zsh.org/pub/zsh-%{version}-doc.tar.xz
%define         SHA256SUM1 9b4e939593cb5a76564d2be2e2bfbb6242509c0c56fd9ba52f5dba6cf06fdcc4

# X10-Update-Spec: { "type": "webscrape", "url": "https://www.zsh.org/pub/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libncurses-devel
BuildRequires:  /usr/bin/nroff
BuildRequires:  autoconf
BuildRequires:  make
BuildRequires:  man-db

Requires:       man-db

Provides:       /bin/zsh

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
echo "%SHA256SUM1  %SOURCE1" | sha256sum -c -
%autosetup -a 0 -a 1

%build
%configure --libdir=%{_prefix}/lib --with-tcsetpgrp
%make_build
%make_install

%files
%license LICENCE
%{_bindir}/*
%if "%{_build}" == "%{_host}"
%{_prefix}/lib/zsh/%{version}
%endif
%{_datadir}/zsh/%{version}
%{_datadir}/zsh/site-functions
%doc %{_mandir}/man1/*

%changelog
