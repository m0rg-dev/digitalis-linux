%define system_python 3.9

Name:           meson
Version:        0.56.0
Release:        2%{?dist}
Summary:        An efficient build system

License:        Apache-2.0
URL:            https://mesonbuild.com/
%undefine       _disable_source_fetch
Source0:        https://github.com/mesonbuild/meson/releases/download/%{version}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 291dd38ff1cd55fcfca8fc985181dd39be0d3e5826e5f0013bf867be40117213
BuildArch:      noarch

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/mesonbuild/meson.git", 
# X10-Update-Spec:   "pattern": "^((?:\\d+\\.?)+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  make
BuildRequires:  python
BuildRequires:  python%{system_python}
BuildRequires:  python-setuptools

Requires:       python-setuptools

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
# TODO python versioning
python3 setup.py build

%install
python3 setup.py install --skip-build --root %{buildroot}

# danger: terrible hack
%if "%{system_python}" != "3.9"
if [ -e %{buildroot}%{_prefix}/lib/python3.9 ]; then
    mv %{buildroot}%{_prefix}/lib/python{3.9,%{system_python}}
fi
%endif

%files
%license COPYING
%{_bindir}/meson
%{_datadir}/polkit-1/actions/*
%{_prefix}/lib/python%{system_python}/site-packages/*
%doc %{_mandir}/man1/meson*

%changelog

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 0.56.0 release 2
  Updated to Python 3.9
