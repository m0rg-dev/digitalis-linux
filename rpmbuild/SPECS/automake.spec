Name:           automake
Version:        1.16.3
Release:        1%{?dist}
Summary:        another giant pile of m4

License:        GPLv3+
URL:            https://gnu.org/software/automake
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 ff2bf7656c4d1c6fdda3b8bebb21f09153a736bcba169aaf65eab25fa113bf3a
BuildArch:      noarch

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/automake/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  make
BuildRequires:  perl
BuildRequires:  autoconf

Requires:       autoconf

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
%{_datadir}/aclocal-%(echo %{version} | sed 's/\.[0-9]\+$//')
%{_datadir}/automake-%(echo %{version} | sed 's/\.[0-9]\+$//')

%doc %{_datadir}/doc/automake
%doc %{_datadir}/aclocal/README
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog

* Tue Nov 24 2020 Morgan Thomas <m@m0rg.dev> 1.16.3-1
  Updated to version 1.16.3.
