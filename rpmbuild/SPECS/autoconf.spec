Name:           autoconf
Version:        2.69
Release:        1%{?dist}
Summary:        makes all those configure scripts

License:        GPLv3+
URL:            https://gnu.org/software/autoconf
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 64ebcec9f8ac5b2487125a86a7760d2591ac9e1d3dbd59489633f9de62a57684

BuildArch:      noarch

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  make
BuildRequires:  m4
BuildRequires:  perl

Requires:       m4

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
%{_datadir}/autoconf
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog
