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

%define major_version 1.33
%define patch_version 1

Name:           %{?cross}gtk-doc
Version:        %{major_version}.%{patch_version}
Release:        1%{?dist}
Summary:        A tool for documenting GObject code.

License:        GPLv2
URL:            https://wiki.gnome.org/DocumentationProject/GtkDoc
%undefine       _disable_source_fetch
Source0:        http://ftp.gnome.org/pub/gnome/sources/gtk-doc/%{major_version}/gtk-doc-%{version}.tar.xz
%define         SHA256SUM0 a5cfed2a0b73a09b796fff80ad6d8f040ab2b2655bdc941ac207ffe6d9c10f10

# X10-Update-Spec: { "type": "webscrape", 
# X10-Update-Spec:   "url": "https://download.gnome.org/sources/gtk-doc/cache.json", 
# X10-Update-Spec:   "pattern": "(?:href=\"|/)gtk-doc-((?:\\d+\\.)*\\d+)\\.tar\\..z2?\""}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}pkg-config
BuildRequires:  make automake autoconf which libtool libxslt docbook-dtds docbook-style-xsl
BuildRequires:  /usr/bin/xsltproc

%undefine _annotated_build
%define debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n gtk-doc-%{version}
./autogen.sh

%build
%configure
%make_build

%install
%make_install

%files
%license COPYING
%{_bindir}/*
%{_datadir}/gtk-doc
%{_datadir}/cmake/GtkDoc
%{_datadir}/aclocal/*.m4
%{_datadir}/pkgconfig/*.pc

%changelog

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 1.33.1-1
  Updated to version 1.33.1.
