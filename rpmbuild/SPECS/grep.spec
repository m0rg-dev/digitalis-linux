Name:           grep
Version:        3.5
Release:        2%{?dist}
Summary:        Search by line for a regular expression

License:        GPLv3+
URL:            https://www.gnu.org/software/grep/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 b82ac77707c2ab945520c8404c9fa9f890f7791a62cf2103cf6238acad87a44a

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

- 2020-11-09 Morgan Thomas <m@m0rg.dev> 3.5 release 2
  Enable PCRE support.
