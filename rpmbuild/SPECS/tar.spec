Name:           tar
Version:        1.32
Release:        1%{?dist}
Summary:        GNU Tar provides the ability to create tar archives, as well as various other kinds of manipulation.
License:        GPLv3+
URL:            https://www.gnu.org/software/tar
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 d0d3ae07f103323be809bc3eac0dcc386d52c5262499fe05511ac4788af1fdd8

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/tar/"}

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
export FORCE_UNSAFE_CONFIGURE=1
%configure
%make_build

%install
%make_install
%find_lang %{name}

rm -f %{buildroot}%{_infodir}/dir

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%{_libexecdir}/rmt
%doc %{_infodir}/*.info*.gz
%doc %{_mandir}/man1/*.gz
%doc %{_mandir}/man8/*.gz

%changelog
