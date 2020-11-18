Name:           cni-plugins
Version:        0.8.7
Release:        1%{?dist}
Summary:        Container Network Interface plugins

License:        Apache-2.0
URL:            https://github.com/containernetworking/plugins
%undefine       _disable_source_fetch
Source0:        https://github.com/containernetworking/plugins/archive/v%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 de9fa170b4b6d38f6ff5287b313ddaf3c31f70bccb10e971ad59adadae22dd74

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/containernetworking/plugins.git", 
# X10-Update-Spec:   "pattern": "^v(\\d+\\.\\d+\\.\\d+)$" }

%if "%{_build}" != "%{_host}"
%error This package is not set up for cross-compilation.
%endif

BuildRequires:  git
BuildRequires:  golang
BuildRequires:  make

%undefine _annotated_build
# TODO get golang to do build-ids
%define debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n plugins-%{version}

%build
./build_linux.sh

%install
%{__install} -dm755 %{buildroot}%{_libexecdir}/cni
cp -v bin/* %{buildroot}%{_libexecdir}/cni

%files
%license LICENSE
%{_libexecdir}/cni/*

%changelog
