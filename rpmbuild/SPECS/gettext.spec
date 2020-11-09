Name:           gettext
Version:        0.21
Release:        1%{?dist}
Summary:        An internationalization library

License:        GPLv3+
URL:            https://gnu.org/software/gettext
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/pub/gnu/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 c77d0da3102aec9c07f43671e60611ebff89a996ef159497ce8e59d075786b12

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
%configure --disable-static --libdir=%{_prefix}/lib
%make_build

%install
%make_install
%find_lang gettext-tools
%find_lang gettext-runtime

find %{buildroot} -name '*.la' -exec rm -f {} ';'
rm -f %{buildroot}%{_infodir}/dir

%files -f gettext-tools.lang -f gettext-runtime.lang
# this should be split but i'm having an awful case of the not-giving-a-s**ts
%license COPYING
%{_bindir}/*
%{_prefix}/lib/*.so*
%{_prefix}/lib/gettext
%{_includedir}/*
%{_datadir}/gettext
%{_datadir}/gettext-%{version}
%{_datadir}/aclocal/*.m4
%doc %{_infodir}/*.info*
%doc %{_mandir}/man{1,3}/*
%doc %{_datadir}/doc/gettext
%doc %{_datadir}/doc/libtextstyle

%changelog
