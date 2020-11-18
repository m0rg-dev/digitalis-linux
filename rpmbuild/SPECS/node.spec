Name:           node
Version:        14.15.1
Release:        1%{?dist}
Summary:        An asynchronous JavaScript runtime

License:        MIT
URL:            https://nodejs.org
%undefine       _disable_source_fetch
Source0:        https://nodejs.org/dist/v%{version}/node-v%{version}.tar.gz
%define         SHA256SUM0 a1120472bf55aea745287693a6651e16973e1008c9d6107df350126adf9716fe

# X10-Update-Spec: { "type": "webscrape", "url": "https://nodejs.org/en/", "pattern": "((?:\\d+\\.?)+) LTS"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  python
BuildRequires:  %{?host_tool_prefix}g++
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n node-v%{version}

%build
./configure --prefix=%{_prefix}
%make_build

%install
%make_install

%files
%license LICENSE
%{_bindir}/node
%{_bindir}/npm
%{_bindir}/npx
%{_prefix}/lib/node_modules
%{_includedir}/node
%{_datadir}/systemtap/tapset/node.stp
%doc %{_docdir}/node
%doc %{_mandir}/man1/*

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 14.15.1 release 1
  Updated to version 14.15.1.
