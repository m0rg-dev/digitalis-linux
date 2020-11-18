Name:           setuptools
Version:        50.3.2
Release:        1%{?dist}
Summary:        Easily download, build, install, upgrade, and uninstall Python packages

License:        MIT
URL:            https://pypi.org/project/setuptools/
%undefine       _disable_source_fetch
Source0:        https://github.com/pypa/%{name}/archive/v%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 7d97c001ce9193c6d947bc584b6a19f593e1d2dd4d6c443de3b1e545875bc132
BuildArch:      noarch

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/pypa/setuptools.git", 
# X10-Update-Spec:   "pattern": "^v((?:\\d+\\.?)+)$" }

Provides:       python-setuptools = %{version}-%{release}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  make
BuildRequires:  python3.8

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
python3.8 ./bootstrap.py
python3.8 setup.py build

%install
python3.8 setup.py install --skip-build --root %{buildroot}

%files
%license LICENSE
%{_bindir}/*
%{_prefix}/lib/python3.8/site-packages/*

%changelog
