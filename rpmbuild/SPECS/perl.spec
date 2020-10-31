Name:           perl
Version:        5.32.0
Release:        1%{?dist}
Summary:        Pathologically Eclectic Rubbish Lister

License:        Artistic-1.0-Perl
URL:            https://www.perl.org/
%undefine       _disable_source_fetch
Source0:        https://www.cpan.org/src/5.0/%{name}-%{version}.tar.gz
%define         SHA256SUM0 efeb1ce1f10824190ad1cadbcccf6fdb8a5d37007d0100d2d9ae5f2b5900c0b4

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  gcc

%undefine _annotated_build
%global debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
sh Configure -des -Dprefix=/usr \
    -Dlibs="-lm -lpthread" \
    -Dsysroot=/usr/%{_target} \
    -Dvendorprefix=/usr \
    -Dman1dir=/usr/share/man/man1 \
    -Dman3dir=/usr/share/man/man3 \
    -Dpager="/usr/bin/less -isR" \
    -Duseshrplib \
    -Dusethreads \
    -Dcc=%{?host_tool_prefix}gcc
%make_build

%install
%make_install

%files
%license Artistic
%{_bindir}/*
%{_prefix}/lib/perl5/%{version}
%{_prefix}/lib/perl5/site_perl/%{version}
%doc %{_mandir}/man1/*
%doc %{_mandir}/man3/*

%changelog
