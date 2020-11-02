Name: xml-common
Version: 1.0
Release: 1%{?dist}
Summary: because something has to own the XML catalog
License: None
BuildArch: noarch

BuildRequires: /usr/bin/xmlcatalog

%description

%prep

%build

%install
%{__install} -dm755 %{buildroot}/etc/xml
xmlcatalog --noout --create %{buildroot}/etc/xml/catalog

%files
/etc/xml/catalog

%changelog
