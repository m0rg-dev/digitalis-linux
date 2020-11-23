%define system_python 3.9

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

%define libname libmodulemd

Name:           %{?cross}%{libname}
Version:        2.9.4
Release:        3%{?dist}
Summary:        C Library for manipulating module metadata files

License:        MIT
URL:            https://github.com/fedora-modularity/libmodulemd
%undefine       _disable_source_fetch
Source0:        https://github.com/fedora-modularity/libmodulemd/releases/download/%{libname}-%{version}/modulemd-%{version}.tar.xz
%define         SHA256SUM0 cb86b1dad4f1578895225ba4ee435dbb7d75262898f69a08507b01759bfc81ab

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/fedora-modularity/libmodulemd.git", 
# X10-Update-Spec:   "pattern": "^libmodulemd-((?:\\d+\\.?)+)$" }

Patch0:         libmodulemd-0001-no-cross-validator.patch

BuildRequires:  meson ninja-build gcc gtk-doc

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
BuildRequires: %{?target_tool_prefix}glib2-devel %{?target_tool_prefix}libyaml-devel
BuildRequires: %{?target_tool_prefix}librpm-devel %{?target_tool_prefix}libmagic-devel %{?target_tool_prefix}gtk-doc
BuildRequires: /usr/bin/glib-mkenums
BuildRequires: /usr/bin/xsltproc
BuildRequires: docbook-dtds
BuildRequires: docbook-style-xsl
BuildRequires: pkgconfig(gobject-introspection-1.0)
BuildRequires: help2man
BuildRequires: libmodulemd-devel
BuildRequires: python%{system_python}

Requires:      %{?cross}libmagic

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}
Requires:       %{?cross}librpm-devel %{?cross}libyaml-devel

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -p1 -n modulemd-%{version}

%build

mkdir build
# this is really stupid. libmodulemd depends on having the glib docs installed
# for some unknowable reason, but you can't cross-compile those...
mkdir -p /usr/%{_target}/usr/share/gtk-doc/html/{glib,gobject}
touch /usr/%{_target}/usr/share/gtk-doc/html/{glib,gobject}/index.html
mkdir -p /usr/share/gtk-doc/html/{glib,gobject}
touch /usr/share/gtk-doc/html/{glib,gobject}/index.html
# no idea if that overrides dir is at all correct (or important)

meson -Dbuildtype=release -Dnative=true \
    -Dwith_docs=false -Ddeveloper_build=false -Dskip_introspection=true \
    -Dgobject_overrides_dir_py3='/usr/lib/python%{system_python}/site-packages/gi/overrides' \
    --prefix=%{_prefix} \
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
%exclude /usr/lib/python%{system_python}/site-packages/gi/overrides/*

%files devel
%{_includedir}/*
%{_prefix}/lib/pkgconfig/*.pc
%{_prefix}/lib/*.so
# TODO
# %doc %%{_datadir}/gtk-doc/html/modulemd-2.0

%if "%{_build}" == "%{_target}"
%{_bindir}/modulemd-validator
%doc %{_mandir}/man1/*
%endif

%changelog

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 2.9.4-3
  Updated to Python 3.9

* Sat Nov 07 2020 Morgan Thomas <m@m0rg.dev> 2.9.4-2
  Explicitly depend on a Python version to not break brp-python-bytecompile
