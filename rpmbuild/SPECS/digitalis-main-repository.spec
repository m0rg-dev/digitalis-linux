Name:           digitalis-main-repository
Version:        0.1
Release:        1%{?dist}
Summary:        Main digitalis dnf repository.
License:        None
BuildArch:      noarch

BuildRequires:  /usr/bin/cat

Requires:       dnf

Provides:       digitalis-repository = %{version}-%{release}
Obsoletes:      digitalis-bootstrap-repository

%description
%prep
%build
%install

install -dm755 %{buildroot}/etc/yum.repos.d
cat >%{buildroot}/etc/yum.repos.d/digitalis.repo <<EOF
[digitalis]
name=digitalis
mirrorlist=http://digitalis-repository.s3-website-us-west-1.amazonaws.com/mirrorlist.txt
gpgkey=https://raw.githubusercontent.com/digitalagedragon/digitalis-linux/development/maint-tools/package_key.pem
enabled=1
metadata_expire=1d
gpgcheck=1
EOF

%files
/etc/yum.repos.d/digitalis.repo

%changelog
