Name:           asciidoc
Version:        9.0.4
Release:        1%{?dist}
Summary:        An ASCII-based markup format

License:        GPLv2+
URL:            https://asciidoc.org/
%undefine       _disable_source_fetch
Source0:        https://github.com/asciidoc/asciidoc-py3/releases/download/%{version}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 400368a43f3eee656d7f197382cd3554b50fb370ef2aea6534f431692a356c66

BuildArch:      noarch

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

Requires:       /usr/bin/xsltproc
Requires:       docbook-style-xsl

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup
sed -i '/^XMLLINT/s/xmllint//' a2x.py

%build
%configure
%make_build

%install
%make_install

%files
%license COPYRIGHT
%{_bindir}/*
%{_sysconfdir}/asciidoc
%doc %{_mandir}/man1/*

%changelog
