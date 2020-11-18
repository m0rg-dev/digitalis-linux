Name:           procps
Version:        3.3.16
Release:        1%{?dist}
Summary:        Tools for interacting with /proc

License:        GPLv2+
URL:            https://gitlab.com/procps-ng/procps
%undefine       _disable_source_fetch
Source0:        https://gitlab.com/procps-ng/procps/-/archive/v%{version}/procps-v%{version}.tar.gz
%define         SHA256SUM0 7f09945e73beac5b12e163a7ee4cae98bcdd9a505163b6a060756f462907ebbc

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://gitlab.com/procps-ng/procps.git", 
# X10-Update-Spec:   "pattern": "^v((?:\\d+\\.?)+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libncurses-devel
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  make
BuildRequires:  autoconf
BuildRequires:  automake
BuildRequires:  libtool
BuildRequires:  /usr/bin/autopoint

Requires:       libprocps%{?_isa} = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n libprocps
Summary:        Library interface to procps
License:        GPLv2+
URL:            https://gitlab.com/procps-ng/procps

%description -n libprocps

%package     -n libprocps-devel
Summary:        Development files for libprocps
Requires:       libprocps%{?_isa} = %{version}-%{release}

%description -n libprocps-devel
The libprocps-devel package contains libraries and header files for
developing applications that uselibprocps.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n procps-v%{version}

%build
./autogen.sh
%configure --libdir=%{_prefix}/lib --disable-static --disable-kill \
    ac_cv_func_malloc_0_nonnull=yes \
    ac_cv_func_realloc_0_nonnull=yes
%make_build

%install
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%find_lang %{name}-ng

%files -f %{name}-ng.lang
%license COPYING
%{_bindir}/*
%{_sbindir}/sysctl
%doc %{_mandir}/man{1,5,8}/*
%doc %{_docdir}/procps-ng

%files -n libprocps
%license COPYING
%{_prefix}/lib/libprocps.so.*

%files -n libprocps-devel
%{_prefix}/lib/libprocps.so
%{_prefix}/include/proc
%{_prefix}/lib/pkgconfig/libprocps.pc
%doc %{_mandir}/man3/*

%changelog
