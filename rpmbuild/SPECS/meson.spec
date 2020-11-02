Name:           meson
Version:        0.56.0
Release:        1%{?dist}
Summary:        An efficient build system

License:        Apache-2.0
URL:            https://mesonbuild.com/
%undefine       _disable_source_fetch
Source0:        https://github.com/mesonbuild/meson/releases/download/%{version}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 291dd38ff1cd55fcfca8fc985181dd39be0d3e5826e5f0013bf867be40117213
BuildArch:      noarch

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  make
BuildRequires:  python

Requires:       setuptools

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%{__python3} setup.py build

%install
%{__python3} setup.py install --skip-build --root %{buildroot}

%files
%license COPYING
%{_bindir}/meson
%{_datadir}/polkit-1/actions/*
%{_prefix}/lib/python3.8/site-packages/*
%doc %{_mandir}/man1/meson*

%changelog
