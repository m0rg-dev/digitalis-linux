Name:           pinentry
Version:        1.1.0
Release:        1%{?dist}
Summary:        Various ways for GPG to read passwords

License:        GPLv2+
URL:            https://www.gnupg.org/
%undefine       _disable_source_fetch
Source0:        https://www.gnupg.org/ftp/gcrypt/%{name}/%{name}-%{version}.tar.bz2
%define         SHA256SUM0 68076686fa724a290ea49cdf0d1c0c1500907d1b759a3bcbfbec0293e8f56570

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}g++
BuildRequires:  %{?host_tool_prefix}libncurses-devel
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  %{?host_tool_prefix}libgpg-error-devel
BuildRequires:  %{?host_tool_prefix}libassuan-devel
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

%changelog
