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

%define libname lua

Name:           %{?cross}%{libname}
Version:        5.4.1
Release:        1%{?dist}
Summary:        Lua is a powerful, efficient, lightweight, embeddable scripting language.

License:        MIT
URL:            https:///www.lua.org
%undefine       _disable_source_fetch
Source0:        https://www.lua.org/ftp/%{libname}-%{version}.tar.gz
%define         SHA256SUM0 4ba786c3705eb9db6567af29c91a01b81f1c0ac3124fdbf6cd94bdd9e53cca7d

# X10-Update-Spec: { "type": "webscrape", "url": "https://www.lua.org/ftp/", "pattern": "(?:HREF=\"|/)\\w+-((?:\\d+\\.)*\\d+)\\.tar\\..z2?\""}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc
BuildRequires:  gcc make

Requires:       %{?cross}liblua

%undefine _annotated_build
%define   debug_package %{nil}

%description

%package     -n %{?cross}liblua
Summary:        lua(1), but library (empty package for consistency with shared libraries)
License:        MIT
URL:            https:///www.lua.org

%description -n %{?cross}liblua

%package     -n %{?cross}liblua-devel
Summary:        Development files for liblua
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}liblua-devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build
export CFLAGS=""
export LDFLAGS=""
# lua is too cool for autoconf
%make_build CC="%{?target_tool_prefix}gcc -std=gnu99" AR="%{?target_tool_prefix}ar rcu" RANLIB="%{?target_tool_prefix}ranlib" MYCFLAGS="-fPIC" MYLDFLAGS="-fPIC"

%install
%make_install INSTALL_TOP=%{buildroot}/%{_prefix} INSTALL_MAN=%{buildroot}/%{_mandir}/man1
find %{buildroot} -name '*.la' -exec rm -f {} ';'

# lua is also too cool for pkgconfig
install -dm755 %{buildroot}/%{_prefix}/lib/pkgconfig
cat > %{buildroot}/%{_prefix}/lib/pkgconfig/lua.pc << "EOF"
V=5.3
R=%{version}

prefix=%{_prefix}
INSTALL_BIN=\${prefix}/bin
INSTALL_INC=\${prefix}/include
INSTALL_LIB=\${prefix}/lib
INSTALL_MAN=\${prefix}/share/man/man1
INSTALL_LMOD=\${prefix}/share/lua/\${V}
INSTALL_CMOD=\${prefix}/lib/lua/\${V}
exec_prefix=\${prefix}
libdir=\${exec_prefix}/lib
includedir=\${prefix}/include

Name: Lua
Description: An Extensible Extension Language
Version: \${R}
Requires:
Libs: -L\${libdir} -llua -lm -ldl
Cflags: -I\${includedir}
EOF

%files
%license doc/readme.html
%{_bindir}/*
%doc %{_mandir}/man1/*

%files -n %{?cross}liblua

%files -n %{?cross}liblua-devel
%{_prefix}/lib/liblua.a
%{_prefix}/lib/pkgconfig/lua.pc
%{_includedir}/*

%changelog
