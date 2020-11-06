Name:           less
Version:        563
Release:        1%{?dist}
Summary:        An advanced file pager.

License:        2-clause BSD
URL:            http://www.greenwoodsoftware.com/less/
%undefine       _disable_source_fetch
Source0:        http://www.greenwoodsoftware.com/less/less-%{version}.tar.gz
%define         SHA256SUM0 ce5b6d2b9fc4442d7a07c93ab128d2dff2ce09a1d4f2d055b95cf28dd0dc9a9a

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libncurses-devel
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
%doc %{_mandir}/man1/*

%changelog
