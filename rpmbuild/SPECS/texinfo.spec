Name:           texinfo
Version:        6.7
Release:        1%{?dist}
Summary:        Texinfo is the official documentation format of the GNU project

License:        GPLv3+
URL:            https://gnu.org/software/texinfo
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/texinfo/%{name}-%{version}.tar.xz
%define         SHA256SUM0 988403c1542d15ad044600b909997ba3079b10e03224c61188117f3676b02caa

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  perl

Requires:       perl

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --disable-perl-xs --disable-texindex
%make_build

%install
%make_install
%find_lang %{name}
%find_lang %{name}_document
rm -f %{buildroot}%{_infodir}/dir

%files -f %{name}.lang -f %{name}_document.lang
%license COPYING
%{_bindir}/install-info
%{_bindir}/makeinfo
%{_bindir}/pdftexi2dvi
%{_bindir}/pod2texi
%{_bindir}/texi2any
%{_bindir}/texi2dvi
%{_bindir}/texi2pdf
%{_bindir}/texindex
%{_datadir}/texinfo
%doc %{_infodir}/*.info*
%doc %{_mandir}/man{1,5}/*

%changelog
