# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%global _oldprefix %{_prefix}
# TODO unify target/usr and target/... but later
%define _prefix /usr/%{_target}/usr
%endif

%define libname glib2

Name:           %{?cross}%{libname}
Version:        2.66.2
Release:        1%{?dist}
Summary:        GLib library of C routines

License:        GPLv2+
URL:            http://www.gtk.org/
%undefine       _disable_source_fetch
Source0:        http://ftp.gnome.org/pub/gnome/sources/glib/2.66/glib-%{version}.tar.xz
%define         SHA256SUM0 ec390bed4e8dd0f89e918f385e8d4cfd7470b1ef7c1ce93ec5c4fc6e3c6a17c4

BuildRequires:  meson ninja-build gcc g++ git

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc
BuildRequires: %{?target_tool_prefix}meson-toolchain %{?target_tool_prefix}libffi-devel
BuildRequires: %{?target_tool_prefix}zlib-devel


%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?target_tool_prefix}libffi-devel %{?target_tool_prefix}zlib-devel

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


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
%{_bindir}/*
%{_prefix}/lib/*.so.*
%{_datadir}/bash-completion/completions/*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_datadir}/gdb/auto-load/%{_prefix}/lib/*.py
%{_prefix}/lib/glib-2.0
%{_prefix}/lib/pkgconfig/*.pc
%{_datadir}/glib-2.0
%{_datadir}/aclocal/*.m4
%{_datadir}/gettext/its/gschema.*

%changelog

