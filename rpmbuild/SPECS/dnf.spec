%define system_python 3.9

Name:           dnf
Version:        4.4.2
Release:        2%{?dist}
Summary:        A powerful RPM-based package manager

License:        GPLv2
URL:            https://github.com/rpm-software-management/dnf
%undefine       _disable_source_fetch
Source0:        https://github.com/rpm-software-management/dnf/archive/%{version}.tar.gz#/dnf-%{version}.tar.gz
%define         SHA256SUM0 175c4f4488c9263df026e16e8df610485b6a6aac6183321f13caf7585959ee14
Source1:        dnf-01-etc-dnf-dnf.conf

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/rpm-software-management/dnf.git", 
# X10-Update-Spec:   "pattern": "^(\\d+\\.\\d+\\.\\d+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
BuildRequires: %{?host_tool_prefix}cmake-toolchain
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}librpm-devel
BuildRequires:  %{?host_tool_prefix}libsolv-devel
BuildRequires:  %{?host_tool_prefix}libdnf-devel
BuildRequires:  %{?host_tool_prefix}libcomps-devel
BuildRequires:  make
BuildRequires:  cmake
BuildRequires:  python%{system_python}

Requires:       libdnf
Requires:       libcomps
Requires:       rpm

%undefine _annotated_build
%global debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
mkdir build
cd build
cmake \
%if "%{_build}" != "%{_target}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_target}/cmake_toolchain \
%endif
    -DPYTHON_EXECUTABLE:FILEPATH=/usr/bin/python%{system_python} \
    -DCMAKE_INSTALL_PREFIX=%{_prefix} -DPYTHON_DESIRED=3 -DWITH_MAN=0 ..
%make_build

%install
cd build
%make_install

ln -sr %{buildroot}%{_bindir}/dnf-3 %{buildroot}%{_bindir}/dnf
mv %{buildroot}%{_bindir}/dnf-automatic-3 %{buildroot}%{_bindir}/dnf-automatic
install -dm755 %{buildroot}%{_sysconfdir}/yum.repos.d
cp %SOURCE1 %{buildroot}%{_sysconfdir}/dnf/dnf.conf

%files
%license COPYING
%{_bindir}/*
%{_prefix}/lib/python%{system_python}/site-packages/dnf
%{_prefix}/lib/tmpfiles.d
%exclude %{_prefix}/lib/systemd
%config %{_sysconfdir}/libreport
%config %{_sysconfdir}/dnf
%config %{_sysconfdir}/logrotate.d/dnf
%config %{_sysconfdir}/bash_completion.d/dnf
%dir %{_sysconfdir}/yum.repos.d

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 4.4.2 release 2
  Updated to Python 3.9

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 4.4.2 release 1
  Updated to version 4.4.2.

- 2020-11-16 Morgan Thomas <m@m0rg.dev> 4.2.6 release 2
  Package our own config file.
