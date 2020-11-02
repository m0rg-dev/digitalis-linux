Name:           digitalis-bootstrap-repository
Version:        0.1
Release:        1%{?dist}
Summary:        dnf repo for digitalis bootstrap process
License:        None
BuildArch:      noarch

BuildRequires:  /usr/bin/cat

Requires:       dnf

Provides:       digitalis-repository

%description
%prep
%build
%install

install -dm755 %{buildroot}/etc/yum.repos.d
cat >%{buildroot}/etc/yum.repos.d/digitalis.repo <<EOF
[digitalis]
name=digitalis
baseurl=/repo
enabled=1
metadata_expire=1d
gpgcheck=0
EOF

%files
/etc/yum.repos.d/digitalis.repo

%changelog
