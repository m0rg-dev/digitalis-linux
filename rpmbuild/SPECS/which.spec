Name:           which
Version:        2.21
Release:        1%{?dist}
Summary:        Shows the full path of shell commands

License:        GPLv3
URL:            https://carlowood.github.io/which/
%undefine       _disable_source_fetch
Source0:        https://carlowood.github.io/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 f4a245b94124b377d8b49646bf421f9155d36aa7614b6ebf83705d3ffc76eaad

# X10-Update-Spec: { "type": "webscrape", "url": "https://carlowood.github.io/which/", "pattern": "(?:HREF=\"|/)\\w+-((?:\\d+\\.)*\\d+)\\.tar\\..z2?\""}

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
%configure
%make_build

%install
%make_install
rm -f %{buildroot}%{_infodir}/dir

%files
%license COPYING
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog
