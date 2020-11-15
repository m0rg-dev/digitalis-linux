# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%global _oldprefix %{_prefix}
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

%define libname gobject-introspection

Name:           %{?cross}lib%{libname}
Version:        1.64.1
Release:        2%{?dist}
Summary:        C Library for manipulating module metadata files

License:        LGPLv2+, GPLv2+, MIT
URL:            https://gi.readthedocs.io/en/latest/
%undefine       _disable_source_fetch
Source0:        https://download.gnome.org/sources/%{libname}/1.64/%{libname}-%{version}.tar.xz
%define         SHA256SUM0 80beae6728c134521926affff9b2e97125749b38d38744dc901f4010ee3e7fa7

BuildRequires:  meson ninja-build gcc glib2-devel flex bison

%if "%{_build}" != "%{_target}"
BuildRequires:  pkgconfig(gobject-introspection-1.0)
%endif

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
BuildRequires: %{?target_tool_prefix}glib2-devel
BuildRequires: %{?target_tool_prefix}libpython-devel

# hack until I figure out what's *supposed* to generate these
Provides:      pkgconfig(gobject-introspection-1.0) = %{version}-%{release}

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package     -n %{?cross}gobject-introspection
Summary:        Command-line utilities for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}gobject-introspection

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

# i really don't know
sed -i "s/    subdir('tests')//" meson.build

%build

mkdir build

meson -Dpython=python3.8 -Dbuildtype=release -Dgi_cross_use_prebuilt_gi=true -Dbuild_introspection_data=false --prefix=%{_prefix} \
%if "%{_build}" != "%{_target}"
    --cross-file %{_target} \
%endif
    build/
ninja %{?_smp_mflags} -C build

%install
DESTDIR=%{buildroot} ninja -C build install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING.GPL COPYING.LGPL
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%{_prefix}/lib/gobject-introspection

%{_datadir}/aclocal/*.m4
%{_datadir}/gobject-introspection-1.0
%{_datadir}/gir-1.0

%files -n %{?cross}gobject-introspection
%{_bindir}/g-ir-annotation-tool
%{_bindir}/g-ir-compiler
%{_bindir}/g-ir-generate
%{_bindir}/g-ir-inspect
%{_bindir}/g-ir-scanner
%doc %{_mandir}/man1/g-ir-compiler.*
%doc %{_mandir}/man1/g-ir-generate.*
%doc %{_mandir}/man1/g-ir-scanner.*

%changelog

- 2020-11-07 Morgan Thomas <m@m0rg.dev> 1.64.1 release 2
  Explicitly target Python 3.8.
