Name:           mkinitcpio
Version:        29
Release:        1%{?dist}
Summary:        Arch Linux's initramfs builder

License:        GPLv2
URL:            https://git.archlinux.org/mkinitcpio.git/
%undefine       _disable_source_fetch
Source0:        https://git.archlinux.org/mkinitcpio.git/snapshot/mkinitcpio-%{version}.tar.gz
%define         SHA256SUM0 9f229a3cf5096d605f2043e0eb11ec57fc5b6f6f2e5d410b132920ae2573d86f

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://git.archlinux.org/mkinitcpio.git", 
# X10-Update-Spec:   "pattern": "^v((?:\\d+\\.?)+)$" }

BuildArch:      noarch
AutoReqProv:    no

BuildRequires:  make
BuildRequires:  asciidoc

Requires:       archive
Requires:       mkinitcpio-busybox

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%make_build -j1

%install
%make_install
cat >%{buildroot}%{_prefix}/lib/initcpio/install/allmods <<"EOF"
#!/bin/bash

build() {
    add_all_modules '*'
}
EOF


%files
%license LICENSE
%{_bindir}/lsinitcpio
%{_bindir}/mkinitcpio
%{_prefix}/lib/initcpio
%{_prefix}/lib/kernel
%{_prefix}/lib/tmpfiles.d/mkinitcpio.conf
%exclude %{_prefix}/lib/systemd
%{_datadir}/bash-completion/completions/*
%{_datadir}/zsh/site-functions/*
%{_datadir}/libalpm/{scripts,hooks}/*
%{_datadir}/mkinitcpio/*
%config %{_sysconfdir}/mkinitcpio.conf
%doc %{_mandir}/man{1,5,8}/*

%changelog
