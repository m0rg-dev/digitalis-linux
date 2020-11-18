Name:           flex
Version:        2.6.4
Release:        1%{?dist}
Summary:        The fast lexical analyzer generator

License:        BSD
URL:            https://github.com/westes/flex
%undefine       _disable_source_fetch
Source0:        https://github.com/westes/%{name}/releases/download/v%{version}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 e87aae032bf07c26f85ac0ed3250998c37621d95f8bd748b31f15b33c45ee995

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/westes/flex.git", 
# X10-Update-Spec:   "pattern": "^v(\\d+\\.\\d+\\.\\d+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  libtool
BuildRequires:  autoconf
BuildRequires:  automake
BuildRequires:  texinfo
BuildRequires:  gettext
BuildRequires:  /usr/bin/autopoint

Requires:       m4

Requires:       libfl%{?_isa} = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n libfl
Summary:        The flex lexer library
License:        BSD

%description -n libfl

%package     -n libfl-devel
Summary:        Development files for libfl
Requires:       libfl%{?_isa} = %{version}-%{release}

%description -n libfl-devel
The libfl-devel package contains libraries and header files for
developing applications that use libfl.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

./autogen.sh

%build
# should probably report those ac_cvs to upstream - they don't forward-declare
# the replacement functions and the built program SEGVs if sizeof(int) != sizeof(void *)
%configure --libdir=%{_prefix}/lib --disable-static \
    ac_cv_func_malloc_0_nonnull=yes \
    ac_cv_func_realloc_0_nonnull=yes
%make_build

%install
%make_install
%find_lang %{name}

find %{buildroot} -name '*.la' -exec rm -f {} ';'
rm -f %{buildroot}%{_infodir}/dir

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*
%doc %{_datadir}/doc/flex

%files -n libfl
%license COPYING
%{_prefix}/lib/libfl.so.*

%files -n libfl-devel
%{_prefix}/lib/libfl.so
%{_includedir}/*

%changelog
