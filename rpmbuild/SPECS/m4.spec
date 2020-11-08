Name:           m4
Version:        1.4.18
Release:        1%{?dist}
Summary:        GNU M4 is an implementation of the traditional Unix macro processor.

License:        GPLv3+
URL:            https://www.gnu.org/software/m4/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 f2c1e86ca0a404ff281631bdc8377638992744b175afb806e25871a24a934e07

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

%undefine _annotated_build
%global debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

# TODO this should be a patch
sed -i 's/IO_ftrylockfile/IO_EOF_SEEN/' lib/*.c
echo "#define _IO_IN_BACKUP 0x100" >> lib/stdio-impl.h

%build
%configure
%make_build

%install
%make_install

rm -f %{buildroot}%{_infodir}/dir

%files
%license COPYING
%{_bindir}/m4
%doc %{_infodir}/%{name}.info*.gz
%doc %{_mandir}/man1/%{name}.1.gz

%changelog
