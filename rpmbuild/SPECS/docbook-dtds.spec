Name:       docbook-dtds
Version:    4.5
Release:    1%{?dist}
Summary:    XML document type definitions for DocBook

# TODO what the heck does this actually mean
License:    Copyright only
URL:        http://www.oasis-open.org/docbook/
%undefine   _disable_source_fetch
Source0:    https://docbook.org/xml/%{version}/docbook-xml-%{version}.zip
%define     SHA256SUM0 4e4e037a2b83c98c6c94818390d4bdd3f6e10f6ec62dd79188594e26190dc7b4

BuildArch:  noarch

Requires(post): /usr/bin/xmlcatalog
Requires(postun): /usr/bin/xmlcatalog

BuildRequires:  /usr/bin/bsdtar

Requires: xml-common

%description

%prep
rm -rf docbook-xml-%{version}
mkdir -p docbook-xml-%{version}
cd docbook-xml-%{version}
bsdtar xf %SOURCE0

%build

%install
cd docbook-xml-%{version}
%{__install} -v -dm755 %{buildroot}%{_datadir}/xml/docbook/xml-dtd-%{version}
%{__install} -v -dm755 %{buildroot}%{_sysconfdir}/xml
cp -vfr docbook.cat *.dtd ent/ *.mod %{buildroot}%{_datadir}/xml/docbook/xml-dtd-%{version}

# TODO I have no clue if any of this is right
%post
if [ ! -e /etc/xml/docbook ]; then
    xmlcatalog --noout --create /etc/xml/docbook
fi
while read f desc; do
    xmlcatalog --noout --add "public" "$desc" "file:///usr/share/xml/docbook/xml-dtd-%{version}/" /etc/xml/docbook
done <<ENDENT
    docbookx.dtd    -//OASIS//DTD DocBook XML V4.5//EN
    calstblx.dtd    -//OASIS//DTD DocBook XML CALS Table Model V4.5//EN
    soextblx.dtd    -//OASIS//DTD XML Exchange Table Model 19990315//EN
    dbpoolx.mod     -//OASIS//ELEMENTS DocBook XML Information Pool V4.5//EN
    dbhierx.mod     -//OASIS//ELEMENTS DocBook XML Document Hierarchy V4.5//EN
    htmltblx.mod    -//OASIS//ELEMENTS DocBook XML HTML Tables V4.5//EN
    dbnotx.mod      -//OASIS//ENTITIES DocBook XML Notations V4.5//EN
    dbcentx.mod     -//OASIS//ENTITIES DocBook XML Character Entities V4.5//EN
    dbgenent.mod    -//OASIS//ENTITIES DocBook XML Additional General Entities V4.5//EN
ENDENT
xmlcatalog --noout --add "rewriteSystem" "http://www.oasis-open.org/docbook/xml/%{version}" "file:///usr/share/xml/docbook/xml-dtd-%{version}" /etc/xml/docbook
xmlcatalog --noout --add "rewriteURI" "http://www.oasis-open.org/docbook/xml/%{version}" "file:///usr/share/xml/docbook/xml-dtd-%{version}" /etc/xml/docbook
xmlcatalog --noout --add "delegatePublic" "-//OASIS//ENTITIES DocBook XML" "file:///etc/xml/docbook" etc/xml/catalog
xmlcatalog --noout --add "delegatePublic" "-//OASIS//DTD DocBook XML" "file:///etc/xml/docbook" etc/xml/catalog
xmlcatalog --noout --add "delegateSystem" "http://www.oasis-open.org/docbook/" "file:///etc/xml/docbook" etc/xml/catalog
xmlcatalog --noout --add "delegateURI" "http://www.oasis-open.org/docbook/" "file:///etc/xml/docbook" etc/xml/catalog

for DTDVERSION in 4.1.2 4.2 4.3 4.4; do
    xmlcatalog --noout --add "public" "-//OASIS//DTD DocBook XML V$DTDVERSION//EN" "http://www.oasis-open.org/docbook/xml/$DTDVERSION/docbookx.dtd" /etc/xml/docbook
    xmlcatalog --noout --add "rewriteSystem" "http://www.oasis-open.org/docbook/xml/$DTDVERSION" "file:///usr/share/xml/docbook/xml-dtd-%{version}" /etc/xml/docbook
    xmlcatalog --noout --add "rewriteURI" "http://www.oasis-open.org/docbook/xml/$DTDVERSION" "file:///usr/share/xml/docbook/xml-dtd-%{version}" /etc/xml/docbook
    xmlcatalog --noout --add "delegateSystem" "http://www.oasis-open.org/docbook/xml/$DTDVERSION/" "file:///etc/xml/docbook" /etc/xml/catalog
    xmlcatalog --noout --add "delegateURI" "http://www.oasis-open.org/docbook/xml/$DTDVERSION/" "file:///etc/xml/docbook" /etc/xml/catalog
done

%postun
if [ "$1" = 0 ]; then
    while read f; do
        xmlcatalog --noout --del /usr/share/xml/docbook/xml-dtd-%{version}/ /etc/xml/docbook
    done <<ENDENT
        docbookx.dtd
        calstblx.dtd
        soextblx.dtd
        dbpoolx.mod 
        dbhierx.mod 
        htmltblx.mod
        dbnotx.mod  
        dbcentx.mod 
        dbgenent.mod
    ENDENT

    xmlcatalog --noout --del /usr/share/xml/docbook/xml-dtd-%{version}/ /etc/xml/catalog
fi

%files
%{_datadir}/xml/docbook/xml-dtd-%{version}

%changelog
