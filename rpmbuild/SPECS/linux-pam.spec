# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

Name:           %{?cross}linux-pam
Version:        1.5.1
Release:        1%{?dist}
Summary:        Pluggable Authentication Modules

License:        3-clause BSD
URL:            https://github.com/linux-pam/linux-pam
%undefine       _disable_source_fetch
Source0:        https://github.com/linux-pam/linux-pam/releases/download/v%{version}/Linux-PAM-%{version}.tar.xz
%define         SHA256SUM0 201d40730b1135b1b3cdea09f2c28ac634d73181ccd0172ceddee3649c5792fc

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/linux-pam/linux-pam.git", 
# X10-Update-Spec:   "pattern": "^v((?:\\d+\\.?)+)$" }

Source1:        linux-pam-01-other
Source2:        linux-pam-02-system-account
Source3:        linux-pam-03-system-auth
Source4:        linux-pam-04-system-session
Source5:        linux-pam-05-system-password

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif

BuildRequires:  %{?target_tool_prefix}gcc
BuildRequires:  gcc
BuildRequires:  make

Requires:       %{?cross}libpam%{?_isa} = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n %{?cross}libpam
Summary:        Support library for linux-pam
License:        3-clause BSD

%description -n %{?cross}libpam

%package     -n %{?cross}libpam-devel
Summary:        Development files for libpam
Requires:       %{?cross}libpam%{?_isa} = %{version}-%{release}

%description -n %{?cross}libpam-devel
The libpam-devel package contains libraries and header files for
developing applications that use libpam.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n Linux-PAM-%{version}

%build
%configure --libdir=%{_prefix}/lib --includedir=%{_includedir}/security --enable-securedir=%{_prefix}/lib/security --host=%{_target}
%make_build

%install
%make_install
%{__install} -dm755 %{buildroot}%{_sysconfdir}/pam.d
%{__install} -m644 %SOURCE1 %{buildroot}%{_sysconfdir}/pam.d/other
%{__install} -m644 %SOURCE2 %{buildroot}%{_sysconfdir}/pam.d/system-account
%{__install} -m644 %SOURCE3 %{buildroot}%{_sysconfdir}/pam.d/system-auth
%{__install} -m644 %SOURCE4 %{buildroot}%{_sysconfdir}/pam.d/system-session
%{__install} -m644 %SOURCE5 %{buildroot}%{_sysconfdir}/pam.d/system-password

chmod -v 4755 %{buildroot}%{_sbindir}/unix_chkpwd

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%find_lang Linux-PAM

%files -f Linux-PAM.lang
%license COPYING Copyright
%{_sbindir}/*
%doc %{_mandir}/man{5,8}/*
%doc %{_docdir}/Linux-PAM

%files -n %{?cross}libpam
%license COPYING Copyright
%{_prefix}/lib/*.so.*
%{_prefix}/lib/security
%exclude %{_prefix}/lib/systemd
%if %{isnative}
%dir %{_sysconfdir}/pam.d
%config %{_sysconfdir}/pam.d/*
%config %{_sysconfdir}/security/*
%config %{_sysconfdir}/environment
%else
%exclude %{_sysconfdir}
%endif

%files -n %{?cross}libpam-devel
%{_includedir}/*
%{_prefix}/lib/*.so
%doc %{_mandir}/man3/*

%changelog

* Fri Nov 27 2020 Morgan Thomas <m@m0rg.dev> 1.5.1-1
  Updated to version 1.5.1.

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 1.5.0-1
  Updated to version 1.5.0.
