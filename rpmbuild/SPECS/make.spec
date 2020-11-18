Name:           make
Version:        4.3
Release:        1%{?dist}
Summary:        GNU Make is a tool which controls the generation of executables and other non-source files of a program from the program's source files.

License:        GPLv3+
URL:            https://www.gnu.org/software/make
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 e05fdde47c5f7ca45cb697e973894ff4f5d79e13b750ed57d7b66d8defc78e19

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/make/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

%undefine _annotated_build

%description

%package        devel
Summary:        Development files for gnumake
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --without-guile
%make_build

%install
%make_install
%find_lang %{name}

rm -f %{buildroot}%{_infodir}/dir

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%files devel
%{_includedir}/gnumake.h

%changelog
