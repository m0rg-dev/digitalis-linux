Name:           man-db
Version:        2.9.3
Release:        4%{?dist}
Summary:        Manual page database and viewer.

License:        GPLv3+
URL:            https://nongnu.org/man-db/
%undefine       _disable_source_fetch
Source0:        http://download.savannah.nongnu.org/releases/man-db/man-db-%{version}.tar.xz
%define         SHA256SUM0 fa5aa11ab0692daf737e76947f45669225db310b2801a5911bceb7551c5597b8

# X10-Update-Spec: { "type": "webscrape", "url": "http://download.savannah.nongnu.org/releases/man-db/", "pattern": "(?:href=\"|/)man-db-((?:\\d+\\.)*\\d+)\\.tar\\..z2?\"" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libpipeline-devel
BuildRequires:  %{?host_tool_prefix}libgdbm-devel
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  %{?host_tool_prefix}zlib-devel
BuildRequires:  groff
BuildRequires:  make
BuildRequires:  man-db-user

Requires:       groff
Requires:       man-db-user

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure \
%if "%{_build}" != "%{_host}"
    --disable-cache-owner \
%endif
    --libdir=%{_prefix}/lib \
    --with-zlib
%make_build

%install
%make_install

rm -rf %{buildroot}/lib/systemd
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%find_lang %{name}
%find_lang %{name}-gnulib

%post
/usr/bin/mandb -q

%transfiletriggerin -- %{_mandir}
/usr/bin/mandb -q

%transfiletriggerun -- %{_mandir}
/usr/bin/mandb -q

%files -f %{name}.lang -f %{name}-gnulib.lang
%license README
%{_bindir}/*
%{_sbindir}/*
%{_libexecdir}/*
%{_prefix}/lib/
%config %{_sysconfdir}/man_db.conf
%doc %{_docdir}/man-db
%doc %{_mandir}/man1/*
%doc %{_mandir}/man5/*
%doc %{_mandir}/man8/*
%doc %{_mandir}/*/man1/*
%doc %{_mandir}/*/man5/*
%doc %{_mandir}/*/man8/*

%changelog

- 2020-11-17 Morgan Thomas <m@m0rg.dev> 2.9.3 release 4
  Add zlib support.

- 2020-11-17 Morgan Thomas <m@m0rg.dev> 2.9.3 release 3
  Pass -q to /usr/bin/mandb in scriptlets.
