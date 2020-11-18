Name:           udev-init-scripts
Version:        34
Release:        1%{?dist}
Summary:        Udev startup scripts from Gentoo

License:        GPLv2
URL:            https://gitweb.gentoo.org/proj/udev-gentoo-scripts.git/
%undefine       _disable_source_fetch
Source0:        https://gitweb.gentoo.org/proj/udev-gentoo-scripts.git/snapshot/udev-gentoo-scripts-%{version}.tar.gz
%define         SHA256SUM0 b245b999f0f3a5c2fa12e95115767d0983013e6a23c4b3792640385bb8e1e853

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://anongit.gentoo.org/git/proj/udev-gentoo-scripts.git", 
# X10-Update-Spec:   "pattern": "^((?:\\d+\\.?)+)$" }

BuildArch:      noarch

BuildRequires:  make

Requires:       eudev

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n udev-gentoo-scripts-%{version}

%build
%make_build

%install
%make_install

%{__install} -dm755 %{buildroot}%{_sysconfdir}/runlevels/sysinit
ln -s /etc/init.d/udev %{buildroot}%{_sysconfdir}/runlevels/sysinit/udev
ln -s /etc/init.d/udev-trigger %{buildroot}%{_sysconfdir}/runlevels/sysinit/udev-trigger

%files
%{_sysconfdir}/init.d/*
%{_sysconfdir}/conf.d/*
%{_sysconfdir}/runlevels/sysinit/*

%changelog
