Name:           libcni
Version:        0.8.0
Release:        1%{?dist}
Summary:        The Container Network Interface

License:        Apache-2.0
URL:            https://github.com/containernetworking/cni
%undefine       _disable_source_fetch
Source0:        https://github.com/containernetworking/cni/archive/v%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 df8afe3eeae3296ba33ca267041c42f13135c3a067bf2d932761bb02998247a6

%if "%{_build}" != "%{_host}"
%error This package is not set up for cross-compilation.
%endif

BuildRequires:  git
BuildRequires:  golang
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n cni-%{version}

%build
export GOPATH=$PWD
go get -x github.com/containernetworking/cni/cnitool
false

%install
%make_install
%find_lang %{name}

%files -f %{name}.lang
%license LICENSE
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog
