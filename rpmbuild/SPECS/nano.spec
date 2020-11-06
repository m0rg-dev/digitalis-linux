Name:           nano
Version:        5.3
Release:        1%{?dist}
Summary:        A pico-inspired editor

License:        GPLv3+
URL:            https://gnu.org/software/nano
%undefine       _disable_source_fetch
Source0:        https://www.nano-editor.org/dist/v5/nano-%{version}.tar.xz
%define         SHA256SUM0 c5c1cbcf622d9a96b6030d66409ed12b204e8bc01ef5e6554ebbe6fb1d734352

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libncurses-devel
BuildRequires:  %{?host_tool_prefix}libmagic-devel
BuildRequires:  %{?host_tool_prefix}libbzip2-devel
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure
%make_build

%install
%make_install
%find_lang %{name}

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%{_datadir}/nano
%doc %{_docdir}/nano
%doc %{_infodir}/*.info*
%doc %{_mandir}/man{1,5}/*

%changelog
