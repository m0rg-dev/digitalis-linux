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

%define libname glib2

%define major_version 2.67
%define patch_version 0

Name:           %{?cross}%{libname}
Version:        %{major_version}.%{patch_version}
Release:        1%{?dist}
Summary:        GLib library of C routines

License:        GPLv2+
URL:            http://www.gtk.org/
%undefine       _disable_source_fetch
Source0:        http://ftp.gnome.org/pub/gnome/sources/glib/%{major_version}/glib-%{version}.tar.xz
%define         SHA256SUM0 0b15e57ab6c2bb90ced4e24a1b0d8d6e9a13af8a70266751aa3a45baffeed7c1

# X10-Update-Spec: { "type": "webscrape", "url": "https://download.gnome.org/sources/glib/cache.json"}

BuildRequires:  meson ninja-build gcc g++
#BuildRequires:  git

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
BuildRequires: %{?host_tool_prefix}meson-toolchain
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
BuildRequires: %{?target_tool_prefix}meson-toolchain
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc
BuildRequires: %{?target_tool_prefix}g++
BuildRequires: %{?target_tool_prefix}libffi-devel
BuildRequires: %{?target_tool_prefix}zlib-devel


%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?cross}libffi-devel %{?cross}zlib-devel

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package        utils
Summary:        Command-line utilites for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    utils

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n glib-%{version}

%build

mkdir build
meson -Dbuildtype=release --prefix=%{_prefix} \
%if "%{_build}" != "%{_target}"
    --cross-file %{_target} \
%endif
    build/
ninja %{?_smp_mflags} -C build

%install
DESTDIR=%{buildroot} ninja -C build install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_datadir}/gdb/auto-load/%{_prefix}/lib/*.py
%{_prefix}/lib/glib-2.0
%{_prefix}/lib/pkgconfig/*.pc
%{_datadir}/glib-2.0
%{_datadir}/aclocal/*.m4
%{_datadir}/gettext/its/gschema.*

%files utils
%{_bindir}/gapplication
%{_bindir}/gdbus
%{_bindir}/gdbus-codegen
%{_bindir}/gio
%{_bindir}/gio-querymodules
%{_bindir}/glib-compile-resources
%{_bindir}/glib-compile-schemas
%{_bindir}/glib-genmarshal
%{_bindir}/glib-gettextize
%{_bindir}/glib-mkenums
%{_bindir}/gobject-query
%{_bindir}/gresource
%{_bindir}/gsettings
%{_bindir}/gtester
%{_bindir}/gtester-report
%{_datadir}/bash-completion/completions/*

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 2.67.0 release 1
  Updated to version 2.67.0.

