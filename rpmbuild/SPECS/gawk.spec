Name:           gawk
Version:        5.1.0
Release:        1%{?dist}
Summary:        A text processing language

License:        GPLv3+
URL:            https://www.gnu.org/software/gawk
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 cf5fea4ac5665fd5171af4716baab2effc76306a9572988d5ba1078f196382bd

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for gawkapi
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup
# this should be a patch
sed -i 's/extras//' Makefile.in

%build
%configure --libdir=%{_prefix}/lib
%make_build

%install
%make_install
%find_lang %{name}

rm -f %{buildroot}%{_infodir}/dir

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%{_prefix}/lib/gawk
%{_libexecdir}/awk
%{_datadir}/awk
%doc %{_infodir}/*.info*.gz
%doc %{_mandir}/man1/*.gz
%doc %{_mandir}/man3/*.gz

%files devel
%{_includedir}/gawkapi.h

%changelog
