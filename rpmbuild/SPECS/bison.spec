Name:           bison
Version:        3.7.3
Release:        1%{?dist}
Summary:        A general-purpose parser generator

License:        GPLv3+
URL:            https://www.gnu.org/software/bison/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 88d9e36856b004c0887a12ba00ea3c47db388519629483dd8c3fce9694d4da6f

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}g++
BuildRequires:  make
BuildRequires:  perl
BuildRequires:  m4

Requires:       m4

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib --disable-static
%make_build

%install
%make_install
%find_lang %{name}
%find_lang %{name}-gnulib
%find_lang %{name}-runtime

%files -f %{name}.lang -f %{name}-gnulib.lang -f %{name}-runtime.lang
%license COPYING
%{_bindir}/*
%exclude %{_prefix}/lib/liby.a
%{_datadir}/bison
%{_datadir}/aclocal/bison-i18n.m4
%doc %{_datadir}/doc/bison
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog
