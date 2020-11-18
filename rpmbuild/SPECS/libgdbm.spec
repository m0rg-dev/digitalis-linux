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

%define libname libgdbm

Name:           %{?cross}%{libname}
Version:        1.18.1
Release:        1%{?dist}
Summary:        Key-value store library.

License:        GPLv3+
URL:            https://www.gnu.org.ua/software/gdbm/
%undefine       _disable_source_fetch
Source0:        ftp://ftp.gnu.org/gnu/gdbm/gdbm-%{version}.tar.gz
%define         SHA256SUM0 86e613527e5dba544e73208f42b78b7c022d4fa5a6d5498bf18c8d6f745b91dc

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/gdbm/"}

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


%package     -n gdbm
Summary:        Command-line utilities for libgdbm
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n gdbm

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n gdbm-%{version}

%build

mkdir build
cd build
%define _configure ../configure
export CFLAGS="$CFLAGS -fcommon -fPIE"
%configure --host=%{_target} --libdir=%{_prefix}/lib --disable-static
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'
rm -f %{buildroot}%{_infodir}/dir

%files
%license COPYING
%{_prefix}/lib/*.so.*
%{_datadir}/locale/*/*/gdbm.mo

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%doc %{_infodir}/*.info*
%doc %{_mandir}/man3/*

%files -n gdbm
%{_bindir}/*
%doc %{_mandir}/man1/*

%changelog

