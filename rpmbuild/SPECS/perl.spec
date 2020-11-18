Name:           perl
Version:        5.32.0
Release:        1%{?dist}
Summary:        Pathologically Eclectic Rubbish Lister

License:        Artistic-1.0-Perl
URL:            https://www.perl.org/
%undefine       _disable_source_fetch
Source0:        https://www.cpan.org/src/5.0/%{name}-%{version}.tar.gz
%define         SHA256SUM0 efeb1ce1f10824190ad1cadbcccf6fdb8a5d37007d0100d2d9ae5f2b5900c0b4

# X10-Update-Spec: { "type": "webscrape", "url": "https://www.cpan.org/src/5.0/", "pattern": "(?:href=\"|/)\\w+-(5.\\d+[02468]\\.\\d+)\\.tar\\..z2?\""}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  gcc

# TODO these should happen automatically
Provides:       perl = 5.032000
Provides:       perl = 1:5.032000
Provides:       perl = 1:%{version}

%undefine _annotated_build
%global debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
sh Configure -des -Dprefix=/usr \
    -Dlibs="-lm -lpthread" \
%if "%{_build}" != "%{_target}"
    -Dsysroot=/usr/%{_target} \
%endif
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
/usr/bin/corelist
/usr/bin/cpan
/usr/bin/enc2xs
/usr/bin/encguess
/usr/bin/h2ph
/usr/bin/h2xs
/usr/bin/instmodsh
/usr/bin/json_pp
/usr/bin/libnetcfg
/usr/bin/perl
/usr/bin/perl5.32.0
/usr/bin/perlbug
/usr/bin/perldoc
/usr/bin/perlivp
/usr/bin/perlthanks
/usr/bin/piconv
/usr/bin/pl2pm
/usr/bin/pod2html
/usr/bin/pod2man
/usr/bin/pod2text
/usr/bin/pod2usage
/usr/bin/podchecker
/usr/bin/prove
/usr/bin/ptar
/usr/bin/ptardiff
/usr/bin/ptargrep
/usr/bin/shasum
/usr/bin/splain
/usr/bin/streamzip
/usr/bin/xsubpp
/usr/bin/zipdetails
%{_prefix}/lib/perl5/%{version}
%{_prefix}/lib/perl5/site_perl/%{version}
%doc %{_mandir}/man1/*
%doc %{_mandir}/man3/*

%changelog
