Name:           groff
Version:        1.22.4
Release:        1%{?dist}
Summary:        The groff document formatting system

License:        GPLv3+
URL:            https://gnu.org/software/groff
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/groff/%{name}-%{version}.tar.gz
%define         SHA256SUM0 e78e7b4cb7dec310849004fa88847c44701e8d133b5d4c13057d876c1bad0293

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}g++
BuildRequires:  make
BuildRequires:  perl
BuildRequires:  texinfo

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib
%make_build

%install
%make_install

rm -f %{buildroot}%{_infodir}/dir

%files
%license COPYING
%{_bindir}/addftinfo
%{_bindir}/afmtodit
%{_bindir}/chem
%{_bindir}/eqn
%{_bindir}/eqn2graph
%{_bindir}/gdiffmk
%{_bindir}/glilypond
%{_bindir}/gperl
%{_bindir}/gpinyin
%{_bindir}/grap2graph
%{_bindir}/grn
%{_bindir}/grodvi
%{_bindir}/groff
%{_bindir}/groffer
%{_bindir}/grog
%{_bindir}/grolbp
%{_bindir}/grolj4
%{_bindir}/gropdf
%{_bindir}/grops
%{_bindir}/grotty
%{_bindir}/hpftodit
%{_bindir}/indxbib
%{_bindir}/lkbib
%{_bindir}/lookbib
%{_bindir}/mmroff
%{_bindir}/neqn
%{_bindir}/nroff
%{_bindir}/pdfmom
%{_bindir}/pdfroff
%{_bindir}/pfbtops
%{_bindir}/pic
%{_bindir}/pic2graph
%{_bindir}/post-grohtml
%{_bindir}/pre-grohtml
%{_bindir}/preconv
%{_bindir}/refer
%{_bindir}/roff2dvi
%{_bindir}/roff2html
%{_bindir}/roff2pdf
%{_bindir}/roff2ps
%{_bindir}/roff2text
%{_bindir}/roff2x
%{_bindir}/soelim
%{_bindir}/tbl
%{_bindir}/tfmtodit
%{_bindir}/troff
%{_datadir}/groff/%{version}
%{_datadir}/groff/current
%{_datadir}/groff/site-tmac
%{_prefix}/lib/groff
%doc %{_infodir}/*.info*
%doc %{_mandir}/man{1,5,7}/*
%doc %{_docdir}/groff-%{version}

%changelog
