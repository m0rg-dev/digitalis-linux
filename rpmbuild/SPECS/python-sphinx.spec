Name:           python-sphinx
Version:        3.3.1
Release:        1%{?dist}
Summary:        A documentation tool

License:        MIT
URL:            https://www.sphinx-doc.org/en/master/
%undefine       _disable_source_fetch
Source0:        https://github.com/sphinx-doc/sphinx/archive/v%{version}.tar.gz#/sphinx-%{version}.tar.gz
%define         SHA256SUM0 af59d137d94a9a54b00e9a8a282504ccb9b3a35d00a709568ab0589be6fc8155
BuildArch:      noarch

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/sphinx-doc/sphinx.git", 
# X10-Update-Spec:   "pattern": "^v((?:\\d+\\.?)+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  make
BuildRequires:  python
BuildRequires:  python3.8
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

# danger: terrible hack
if [ -e %{buildroot}%{_prefix}/lib/python3.9 ]; then
    mv %{buildroot}%{_prefix}/lib/python{3.9,3.8}
fi

%files
%license LICENSE
%{_bindir}/*
%{_prefix}/lib/python3.8/site-packages/*

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 3.3.1 release 1
  Updated to version 3.3.1.
