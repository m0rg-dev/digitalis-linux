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
BuildRequires:  python3.8
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
if [ -e %{buildroot}%{_prefix}/lib/python3.9 ]; then
    mv %{buildroot}%{_prefix}/lib/python{3.9,3.8}
fi

%files
%license COPYING
%{_bindir}/meson
%{_datadir}/polkit-1/actions/*
%{_prefix}/lib/python3.8/site-packages/*
%doc %{_mandir}/man1/meson*

%changelog
