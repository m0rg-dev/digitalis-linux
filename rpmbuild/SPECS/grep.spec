Name:           grep
Version:        3.6
Release:        1%{?dist}
Summary:        Search by line for a regular expression

License:        GPLv3+
URL:            https://www.gnu.org/software/grep/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 667e15e8afe189e93f9f21a7cd3a7b3f776202f417330b248c2ad4f997d9373e

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/grep/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libpcre-devel
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --enable-perl-regexp
%make_build

%install
%make_install
%find_lang %{name}

rm -f %{buildroot}%{_infodir}/dir

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 3.6 release 1
  Updated to version 3.6.

- 2020-11-09 Morgan Thomas <m@m0rg.dev> 3.5 release 2
  Enable PCRE support.
