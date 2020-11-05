Name:           inetutils
Version:        1.9.4
Release:        1%{?dist}
Summary:        Legacy network management interface

License:        GPLv3+
URL:            https://www.gnu.org/software/inetutils/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/inetutils/inetutils-%{version}.tar.xz
%define         SHA256SUM0 849d96f136effdef69548a940e3e0ec0624fc0c81265296987986a0dd36ded37

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

# This doesn't autodetect properly
sed -i '/PATH_PROCNET_DEV/s/ no//' paths

%build
%configure --disable-logger     \
           --disable-whois      \
           --disable-rcp        \
           --disable-rexec      \
           --disable-rlogin     \
           --disable-rsh        \
           --disable-hostname   \
           --disable-servers
%make_build

%install
%make_install

%{__install} -dm755 %{buildroot}%{_sbindir}
ln -s ../bin/ifconfig %{buildroot}%{_sbindir}/ifconfig

%files
%license COPYING
%{_bindir}/*
%{_sbindir}/ifconfig
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog
