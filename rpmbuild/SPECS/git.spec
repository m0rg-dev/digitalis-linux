Name:           git
Version:        2.29.2
Release:        1%{?dist}
Summary:        A distributed revision control system

License:        GPLv2
URL:            https://git-scm.com
%undefine       _disable_source_fetch
Source0:        https://github.com/git/%{name}/archive/v%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 8cc15abf2bc1cfa4b8acc37025cf92ec73c20efdb3f243793fef71dfe87478be

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/git/git.git", 
# X10-Update-Spec:   "pattern": "^v(\\d+\\.\\d+\\.\\d+)$" }

Patch0:         git-0001-explicit-python3.patch

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  autoconf
BuildRequires:  %{?host_tool_prefix}zlib-devel
BuildRequires:  %{?host_tool_prefix}libopenssl-devel
BuildRequires:  %{?host_tool_prefix}libcurl-devel
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  asciidoc
BuildRequires:  xmlto
BuildRequires:  /usr/bin/msgfmt

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -p 1
make configure

%build
# TODO shake out these ac_cvs - not sure what they should be, went for
# conservative options
%configure \
    --target=%{_host} \
    --without-tcltk \
    ac_cv_iconv_omits_bom=false \
    ac_cv_fread_reads_directories=false \
    ac_cv_snprintf_returns_bogus=true \
    LDFLAGS=-lcurl
%make_build all doc

%install
%make_install install-doc install-html
%find_lang %{name}

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%{_datadir}/git-core
%{_datadir}/gitweb
%{_libexecdir}/git-core
# TODO
%{_datadir}/perl5/Git
%{_datadir}/perl5/Git.pm
%{_datadir}/perl5/FromCPAN
%doc %{_docdir}/git
%doc %{_mandir}/man{1,3,5,7}/*

%changelog
