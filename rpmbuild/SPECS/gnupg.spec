Name:           gnupg
Version:        2.2.24
Release:        1%{?dist}
Summary:        The GNU Privacy Guard

License:        GPLv2+
URL:            https://www.gnupg.org/
%undefine       _disable_source_fetch
Source0:        https://www.gnupg.org/ftp/gcrypt/%{name}/%{name}-%{version}.tar.bz2
%define         SHA256SUM0 9090b400faae34f08469d78000cfec1cee5b9c553ce11347cc96ef16eab98c46

# X10-Update-Spec: { "type": "webscrape", "url": "https://www.gnupg.org/ftp/gcrypt/gnupg"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libassuan-devel
BuildRequires:  %{?host_tool_prefix}libgpg-error-devel
BuildRequires:  %{?host_tool_prefix}libgcrypt-devel
BuildRequires:  %{?host_tool_prefix}libksba-devel
BuildRequires:  %{?host_tool_prefix}libnpth-devel
BuildRequires:  make
BuildRequires:  gcc

Recommends:     pinentry

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
export SYSROOT=%(%{?target_tool_prefix}gcc -print-sysroot)/usr # needed for libgpg-error config??? someday I'll figure that out
%configure --host=%{_target} --libdir=%{_prefix}/lib \
%if "%{_build}" != "%{_target}"
    --with-libassuan-prefix=/usr/%{_target}/usr \
    --with-gpg-error-prefix=/usr/%{_target}/usr \
    --with-libgcrypt-prefix=/usr/%{_target}/usr \
    --with-ksba-prefix=/usr/%{_target}/usr \
    --with-npth-prefix=/usr/%{_target}/usr \
%endif

%make_build

%install
%make_install
%find_lang gnupg2
rm -f %{buildroot}%{_infodir}/dir

%files -f gnupg2.lang
%license COPYING
%{_bindir}/dirmngr
%{_bindir}/dirmngr-client
%{_bindir}/gpg
%{_bindir}/gpg-agent
%{_bindir}/gpg-connect-agent
%{_bindir}/gpg-wks-server
%{_bindir}/gpgconf
%{_bindir}/gpgparsemail
%{_bindir}/gpgscm
%{_bindir}/gpgsm
%{_bindir}/gpgsplit
%{_bindir}/gpgtar
%{_bindir}/gpgv
%{_bindir}/kbxutil
%{_bindir}/watchgnupg
%{_sbindir}/*
%{_libexecdir}/*
%{_datadir}/gnupg/distsigkey.gpg
%{_datadir}/gnupg/sks-keyservers.netCA.pem
%doc %{_infodir}/*.info*
%doc %{_mandir}/man{1,7,8}/*
%doc %{_datadir}/gnupg/*.txt
%doc %{_datadir}/doc/gnupg

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 2.2.24 release 1
  Updated to version 2.2.24.
