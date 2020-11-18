Name:           bash
Version:        5.0
Release:        2%{?dist}
Summary:        The Bourne Again SHell

License:        GPLv3+
URL:            https://www.gnu.org/software/bash/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 b4a80f2ac66170b2913efbfb9f2594f1f76c7b1afd11f799e22035d63077fb4d

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/bash/", "pattern": "(?:href=\"|/)bash-((?:\\d+\\.)*\\d+)\\.tar\\..z2?\""}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}libncurses-devel
BuildRequires:  gcc make

Requires:       ncurses

Provides:       /bin/sh
Provides:       /bin/bash

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
%configure \
    --without-bash-malloc \
    --libdir=%{_prefix}/lib \
    bash_cv_getcwd_malloc=yes
%make_build

%install
%make_install

ln -sv bash %{buildroot}/%{_bindir}/sh
rm -f %{buildroot}%{_infodir}/dir

%find_lang bash

%files -f bash.lang
%license COPYING
%{_bindir}/sh
%{_bindir}/bash
%{_bindir}/bashbug
%{_prefix}/lib/bash

%doc %{_infodir}/%{name}.info*.gz
%doc %{_mandir}/man1/*.gz
%doc %{_datadir}/doc/bash

%files devel
%{_prefix}/lib/pkgconfig/bash.pc
%{_includedir}/bash

%changelog

- 2020-09-11 Morgan Thomas <m@m0rg.dev> 5.0 release 2
  Set bash_cv_getcwd_malloc=yes in configure to hopefully work out some issues
  related to overlayfs.
