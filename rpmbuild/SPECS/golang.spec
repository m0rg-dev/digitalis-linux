Name:           golang
Version:        1.15.5
Release:        1%{?dist}
Summary:        The Go programming language

License:        3-clause BSD
URL:            https://golang.org
%undefine       _disable_source_fetch
Source0:        https://go.googlesource.com/go/+archive/refs/tags/go%{version}.tar.gz
# Apparently Google likes to change the timestamps in here...
# %%define         SHA256SUM0 9f664e9a8a750d4f20100972268ec3d3212cd2472cebc609b352e5d47ff28804
Source1:        https://dl.google.com/go/go1.4-bootstrap-20171003.tar.gz
%define         SHA256SUM1 f4ff5b5eb3a3cae1c993723f3eab519c5bae18866b5e5f96fe1102f0cb5c3e52

# X10-Update-Spec: { "type": "webscrape", "url": "https://golang.org/dl/", "pattern": "filename\">go((?:\\d+\\.?)+).linux"}

# TODO check arch for cross-compile
# go is self-contained enough to Just Work between systems with identical arch and
# similar libc, but we should do better than that

BuildRequires:  gcc
BuildRequires:  make

Requires:       gcc

%undefine _annotated_build
%define debug_package %{nil}
%define __strip /bin/true

%description

%prep
echo "%SHA256SUM1  %SOURCE1" | sha256sum -c -

rm -rf go%{version}
mkdir go%{version}
cd go%{version}
tar xzf %SOURCE0
cd ..

rm -rf go-bootstrap
mkdir go-bootstrap
cd go-bootstrap
tar xzf %SOURCE1
cd ..

%build

pushd go-bootstrap/go/src
export CGO_ENABLED=0
bash make.bash
popd

pushd go%{version}/src
# This block adapted from Void Linux
unset GCC CC CXX LD CFLAGS
unset CGO_CXXFLAGS CGO_CFLAGS CGO_ENABLED
export GOROOT_BOOTSTRAP="$(realpath ../../go-bootstrap/go)"
export GOROOT=$PWD
export GOROOT_FINAL=%{_prefix}/lib/go
bash make.bash --no-clean -v

%install
cd go%{version}
# This block adapted from Void Linux
%{__install} -dm755 %{buildroot}%{_bindir}
%{__install} -dm755 %{buildroot}%{_prefix}/lib/go
%{__install} -dm755 %{buildroot}%{_datadir}/go
cp -d --preserve=all bin/* %{buildroot}%{_bindir}/
cp -a pkg src lib %{buildroot}%{_prefix}/lib/go/
cp -r doc misc -t %{buildroot}%{_datadir}/go
ln -s /usr/share/go/doc %{buildroot}%{_datadir}/go/doc
ln -sf /usr/bin %{buildroot}%{_prefix}/lib/go/bin
ln -sfr /usr/share/go/misc %{buildroot}%{_prefix}/lib/go/misc

rm -v %{buildroot}%{_prefix}/lib/go/src/*.rc

%files
%license go%{version}/LICENSE
%{_bindir}/*
%{_prefix}/lib/go
%{_datadir}/go/misc
%doc %{_datadir}/go/doc

%changelog

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 1.15.5-1
  Updated to version 1.15.5.
