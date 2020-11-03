Name:           python-sphinx
Version:        3.2.1
Release:        1%{?dist}
Summary:        A documentation tool

License:        MIT
URL:            https://www.sphinx-doc.org/en/master/
%undefine       _disable_source_fetch
Source0:        https://github.com/sphinx-doc/sphinx/archive/v%{version}.tar.gz#/sphinx-%{version}.tar.gz
%define         SHA256SUM0 8816c90665b192b36c4482fb59819c276bae37ed275948fb2ab2ba873aa29d8a
BuildArch:      noarch

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  make
BuildRequires:  python
BuildRequires:  python-setuptools

Requires:       python-setuptools

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n sphinx-%{version}

%build
%{__python3} setup.py build

%install
%{__python3} setup.py install --skip-build --root %{buildroot}

%files
%license LICENSE
%{_bindir}/*
%{_prefix}/lib/python3.8/site-packages/*

%changelog
