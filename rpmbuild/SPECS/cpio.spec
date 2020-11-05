Name:           cpio
Version:        2.13
Release:        1%{?dist}
Summary:        Work with cpio and tar archives

License:        GPLv3+
URL:            https://gnu.org/software/cpio
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/cpio/cpio-2.13.tar.bz2
%define         SHA256SUM0 eab5bdc5ae1df285c59f2a4f140a98fc33678a0bf61bdba67d9436ae26b46f6d

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  bison

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib CFLAGS="%{optflags} -fcommon"
%make_build

%install
%make_install
%find_lang %{name}

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
# rmt provided by tar already
%exclude %{_libexecdir}/rmt
%exclude %{_mandir}/man8/rmt*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog
