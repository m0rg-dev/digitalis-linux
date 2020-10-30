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

%define libname sqlite

Name:           %{?cross}lib%{libname}
Version:        3.33.0
Release:        1%{?dist}
Summary:        SQLite is a C-language library that implements a small, fast, self-contained, high-reliability, full-featured, SQL database engine.

License:        Public domain
URL:            https://sqlite.org
%undefine       _disable_source_fetch
Source0:        https://sqlite.org/2020/sqlite-autoconf-3330000.tar.gz
%define         SHA256SUM0 106a2c48c7f75a298a7557bcc0d5f4f454e5b43811cc738b7ca294d6956bbb15

BuildRequires:  make

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package -n     %{?cross}sqlite
Summary:        sqlite command line interface

%description -n %{?cross}sqlite

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n sqlite-autoconf-3330000

%build

mkdir build
cd build
export CFLAGS="-g -O2 -DSQLITE_ENABLE_FTS3=1 \
    -DSQLITE_ENABLE_FTS4=1 -DSQLITE_ENABLE_COLUMN_METADATA=1 \
    -DSQLITE_ENABLE_UNLOCK_NOTIFY=1 -DSQLITE_ENABLE_DBSTAT_VTAB=1 \
    -DSQLITE_SECURE_DELETE=1 -DSQLITE_ENABLE_FTS3_TOKENIZER=1"
export LDFLAGS=""
../configure --host=%{_target} --prefix=%{_prefix} --libdir=%{_prefix}/lib \
    --enable-fts5  --disable-static
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%{_prefix}/lib/*.so.*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc

%files -n %{?cross}sqlite
%{_bindir}/sqlite3
%doc %{_mandir}/man1/*

%changelog

