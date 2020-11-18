Name:           diffutils
Version:        3.7
Release:        1%{?dist}
Summary:        GNU Diffutils is a package of several programs related to finding differences between files.

License:        GPLv3+
URL:            https://www.gnu.org/software/diffutils
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 b3a7a6221c3dc916085f0d205abf6b8e1ba443d4dd965118da364a1dc1cb3a26

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/diffutils/"}

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
%find_lang %{name}
rm -f %{buildroot}%{_infodir}/dir

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog
