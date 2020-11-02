Name:           docbook-style-xsl
Version:        1.79.2
Release:        1%{?dist}

Summary:        Stylesheets for DocBook XML
License:        DMIT
URL:            https://github.com/docbook/xslt10-stylesheets
%undefine       _disable_source_fetch
Source0:        https://github.com/docbook/xslt10-stylesheets/releases/download/release/%{version}/docbook-xsl-nons-%{version}.tar.bz2
%define         SHA256SUM0 ee8b9eca0b7a8f89075832a2da7534bce8c5478fc8fc2676f512d5d87d832102

BuildArch:      noarch

BuildRequires:  coreutils

Requires(post): /usr/bin/xmlcatalog
Requires(postun): /usr/bin/xmlcatalog

%description

%prep
%autosetup -n docbook-xsl-nons-%{version}

%build

%install

install -v -m755 -d %{buildroot}/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}
cp -v -R VERSION assembly common eclipse epub epub3 extensions fo       \
        highlighting html htmlhelp images javahelp lib manpages params  \
        profiling roundtrip slides template tests tools webhelp website \
        xhtml xhtml-1_1 xhtml5                                          \
    %{buildroot}/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}

ln -s VERSION %{buildroot}/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}/VERSION.xsl

%post
if [ ! -d /etc/xml ]; then install -dm755 /etc/xml; fi
if [ ! -f /etc/xml/catalog ]; then
    xmlcatalog --noout --create /etc/xml/catalog
fi

xmlcatalog --noout --add "rewriteSystem" "https://cdn.docbook.org/release/xsl-nons/%{version}" "/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}" /etc/xml/catalog
xmlcatalog --noout --add "rewriteURI"    "https://cdn.docbook.org/release/xsl-nons/%{version}" "/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}" /etc/xml/catalog
xmlcatalog --noout --add "rewriteSystem" "https://cdn.docbook.org/release/xsl-nons/current"    "/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}" /etc/xml/catalog
xmlcatalog --noout --add "rewriteURI"    "https://cdn.docbook.org/release/xsl-nons/current"    "/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}" /etc/xml/catalog
xmlcatalog --noout --add "rewriteSystem" "http://docbook.sourceforge.net/release/xsl/current"  "/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}" /etc/xml/catalog
xmlcatalog --noout --add "rewriteURI"    "http://docbook.sourceforge.net/release/xsl/current"  "/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}" /etc/xml/catalog

%postun
# remove entries only on removal of package
if [ "$1" = 0 ]; then
    /usr/bin/xmlcatalog --noout --del "/usr/share/xml/docbook/xsl-stylesheets-nons-%{version}" /etc/xml/catalog
fi

%files
%{_datadir}/xml/docbook/xsl-stylesheets-nons-%{version}
%doc README RELEASE-NOTES* NEWS*
