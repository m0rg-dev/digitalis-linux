Name:           htop
Version:        3.0.2
Release:        1%{?dist}
Summary:        An interactive process viewer

License:        GPLv2
URL:            https://htop.dev/
%undefine       _disable_source_fetch
Source0:        https://bintray.com/htop/source/download_file?file_path=htop-%{version}.tar.gz
%define         SHA256SUM0 6471d9505daca5c64073fc37dbab4d012ca4fc6a7040a925dad4a7553e3349c4

# X10-Update-Spec: { "type": "webscrape", "url": "https://htop.dev/downloads.html", "pattern": "in htop ((?:\\d+\\.?)+)"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libncurses-devel
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

%files
%license COPYING
%{_bindir}/htop
%{_datadir}/applications/htop.desktop
%{_datadir}/pixmaps/htop.png
%doc %{_mandir}/man1/*

%changelog
