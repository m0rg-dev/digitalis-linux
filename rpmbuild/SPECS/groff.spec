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
%{_bindir}/*
%{_datadir}/groff/%{version}
%{_datadir}/groff/current
%{_datadir}/groff/site-tmac
%{_prefix}/lib/groff
%doc %{_infodir}/*.info*
%doc %{_mandir}/man{1,5,7}/*
%doc %{_docdir}/groff-%{version}

%changelog
