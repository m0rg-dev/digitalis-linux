Name:           coreutils
Version:        8.32
Release:        1%{?dist}
Summary:        The GNU Core Utilities are the basic file, shell and text manipulation utilities of the GNU operating system.

License:        GPLv3+
URL:            https://www.gnu.org/software/coreutils
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 4458d8de7849df44ccab15e16b1548b285224dbba5f08fac070c1c0e0bcc4cfa

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --enable-install-program=hostname --enable-no-install-program=kill,uptime
%make_build

%install
%make_install
%find_lang %{name}

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%{_libexecdir}/%{name}/*.so
%doc %{_infodir}/*.info*.gz
%doc %{_mandir}/man1/*.gz

%changelog
