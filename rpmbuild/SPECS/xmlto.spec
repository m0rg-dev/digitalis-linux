Name:           xmlto
Version:        0.0.28
Release:        1%{?dist}
Summary:        Convert XML to various formats

License:        GPLv2+
URL:            https://pagure.io/xmlto
%undefine       _disable_source_fetch
Source0:        https://releases.pagure.org/xmlto/xmlto-%{version}.tar.bz2
%define         SHA256SUM0 1130df3a7957eb9f6f0d29e4aa1c75732a7dfb6d639be013859b5c7ec5421276

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  docbook-dtds
BuildRequires:  docbook-style-xsl

Requires:       /usr/bin/xsltproc
Requires:       docbook-dtds
Requires:       docbook-style-xsl

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure
%make_build

%install
%make_install

%files
%license COPYING
%{_bindir}/*
%{_datadir}/xmlto
%doc %{_mandir}/man1/*

%changelog
