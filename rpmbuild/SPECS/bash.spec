Name:           bash
Version:        5.0
Release:        1%{?dist}
Summary:        Bash is the GNU Project's shell—the Bourne Again SHell. 

License:        GPLv3+
URL:            https://www.gnu.org/software/bash/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 b4a80f2ac66170b2913efbfb9f2594f1f76c7b1afd11f799e22035d63077fb4d

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}glibc-devel %{?host_tool_prefix}ncurses-devel
BuildRequires:  gcc make

Requires:       ncurses

%undefine _annotated_build

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --without-bash-malloc
%make_build

%install
%make_install
install -dm755 %{buildroot}/bin
mv %{buildroot}/%{_bindir}/bash %{buildroot}/bin/
ln -sv bash %{buildroot}/bin/sh 

%files
%license COPYING
/bin/bash
/bin/sh
%{_bindir}/bashbug
%{_prefix}/lib64/bash
%{_prefix}/lib64/pkgconfig/bash.pc
%{_datadir}/locale/*/LC_MESSAGES/bash.mo

%doc %{_infodir}/%{name}.info*.gz
%doc %{_mandir}/man1/*.gz
%doc %{_datadir}/doc/bash

%files devel
%{_includedir}/bash

%changelog
