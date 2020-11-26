Name:           iana-etc
Version:        20201120
Release:        1%{?dist}
Summary:        /etc/services and /etc/protocols files

License:        Public domain
URL:            https://www.iana.org/protocols
%undefine       _disable_source_fetch
Source0:        https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xml
%define         SHA256SUM0 7de8f70197974b5238edd5a5a318392d7c262147c7495b7fb64f66b9966d4ec8
Source1:        https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xml
%define         SHA256SUM1 fdb7cc8d00f68fd773ba60768b86838a6f2f713cf56de86ea5f4421a171abb62

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
echo "%SHA256SUM1  %SOURCE1" | sha256sum -c -

%build

%install
# Adapted from https://git.archlinux.org/svntogit/packages.git/tree/trunk/PKGBUILD?h=packages/iana-etc

install -dm755 %{buildroot}%{_sysconfdir}

<%SOURCE0 gawk -F"[<>]" '
/<record/ { v=n="" }
/<value/ { v=$3 }
/<name/ && $3!~/ / { n=$3 }
/<\/record/ && n && v!="" { printf "%%-12s %%3i %%s\n", tolower(n),v,n }
' > %{buildroot}%{_sysconfdir}/protocols

<%SOURCE1 gawk -F"[<>]" '
/<updated/ && !v {v=$3; gsub("-","",v); print "version=" v >"/dev/stderr" }
/<record/ { n=u=p=c="" }
/<name/ && !/\(/ { n=$3 }
/<number/ { u=$3 }
/<protocol/ { p=$3 }
/Unassigned/ || /Reserved/ || /historic/ { c=1 }
/<\/record/ && n && u && p && !c { printf "%%-15s %%5i/%%s\n", n,u,p }
' > %{buildroot}%{_sysconfdir}/services

%files
%{_sysconfdir}/protocols
%{_sysconfdir}/services

%changelog

* Sun Nov 22 2020 Morgan Thomas <m@m0rg.dev> 20201120
  Updated to version 2020-11-20.
