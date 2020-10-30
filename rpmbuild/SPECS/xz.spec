Name:           xz
Version:        5.2.5
Release:        1%{?dist}
Summary:        XZ Utils is free general-purpose data compression software with a high compression ratio.

License:        GPLv2+
URL:            https://tukaani.org/xz/
%undefine       _disable_source_fetch
Source0:        https://tukaani.org/xz/%{name}-%{version}.tar.xz
%define         SHA256SUM0 3e1e518ffc912f86608a8cb35e4bd41ad1aec210df2a47aaa1f95e7f5576ef56

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

Requires: liblzma

%undefine _annotated_build

%description

%package     -n liblzma
Summary:        Libraries for LZMA compression and decompression.
License:        GPLv2+
URL:            https://tukaani.org/xz/

%description -n liblzma

%package     -n liblzma-devel
Summary:        Development files for liblzma
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n liblzma-devel

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib
%make_build

%install
%make_install
%find_lang %{name}
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%doc %{_mandir}/man1/*.gz
%doc %{_mandir}/de/man1/*.gz
%doc %{_datadir}/doc/xz

%files -n liblzma
%{_prefix}/lib/*.so.*
%{_prefix}/lib/pkgconfig/liblzma.pc

%files -n liblzma-devel
%{_prefix}/lib/*.a
%{_prefix}/lib/*.so
%{_includedir}/lzma.h
%{_includedir}/lzma/

%changelog
