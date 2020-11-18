Name:           gperf
Version:        3.1
Release:        1%{?dist}
Summary:        A perfect hash function generator

License:        GPLv3+
URL:            https://gnu.org/software/gperf
%undefine       _disable_source_fetch
Source0:        http://ftp.gnu.org/pub/gnu/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 588546b945bba4b70b6a3a616e80b4ab466e3f33024a352fc2198112cdbb3ae2

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/gperf/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}g++
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

%files
%license COPYING
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*
%doc %{_docdir}/gperf.html

%changelog
