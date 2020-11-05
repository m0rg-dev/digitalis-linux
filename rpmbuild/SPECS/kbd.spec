Name:           kbd
Version:        2.3.0
Release:        1%{?dist}
Summary:        Manage the keyboard on VTs

License:        GPLv2
URL:            https://kbd-project.org/
%undefine       _disable_source_fetch
Source0:        https://mirrors.edge.kernel.org/pub/linux/utils/kbd/kbd-%{version}.tar.xz
%define         SHA256SUM0 685056143cb8effd0a1d44b5c391eb50d80dcfd014b1a4d6e2650a28d61cb82a

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  %{?host_tool_prefix}libpam-devel
BuildRequires:  make
BuildRequires:  autoconf

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib --disable-static
%make_build

%install
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%find_lang %{name}

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%{_datadir}/consolefonts
%{_datadir}/consoletrans
%{_datadir}/keymaps
%{_datadir}/unimaps

# TODO, maybe? it doesn't even have headers
%{_prefix}/lib/libtswrap.*
%doc %{_mandir}/man{1,5,8}/*


%changelog
