Name:           git
Version:        2.29.2
Release:        1%{?dist}
Summary:        A distributed revision control system

License:        GPLv2
URL:            https://git-scm.com
%undefine       _disable_source_fetch
Source0:        https://github.com/git/%{name}/archive/v%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 8cc15abf2bc1cfa4b8acc37025cf92ec73c20efdb3f243793fef71dfe87478be

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  autoconf
BuildRequires:  %{?host_tool_prefix}zlib-devel
BuildRequires:  asciidoc
BuildRequires:  xmlto

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup
make configure

%build
# TODO shake out these ac_cvs - not sure what they should be, went for
# conservative options
%configure \
    --target=%{_host} \
    --without-tcltk \
    ac_cv_iconv_omits_bom=false \
    ac_cv_fread_reads_directories=false \
    ac_cv_snprintf_returns_bogus=true
%make_build all doc

%install
%make_install install-doc install-html install-info
%find_lang %{name}

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog
