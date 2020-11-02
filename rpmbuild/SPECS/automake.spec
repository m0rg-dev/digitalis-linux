Name:           automake
Version:        1.16.2
Release:        1%{?dist}
Summary:        another giant pile of m4

License:        GPLv3+
URL:            https://gnu.org/software/automake
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 ccc459de3d710e066ab9e12d2f119bd164a08c9341ca24ba22c9adaa179eedd0
BuildArch:      noarch

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
