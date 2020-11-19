Name:           buildah
Version:        1.18.0
Release:        1%{?dist}
Summary:        OCI container image building tool

License:        Apache-2.0
URL:            https://buildah.io
%undefine       _disable_source_fetch
Source0:        https://github.com/containers/buildah/archive/v%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 500c82fb369fd08a9bb9a41f294c5975f17575770dbfaba5cce9a6e09b6a3fb9

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/containers/buildah.git", 
# X10-Update-Spec:   "pattern": "^v(\\d+\\.\\d+\\.\\d+)$" }

%if "%{_build}" != "%{_host}"
%error This package is not set up for cross-compilation.
%endif

BuildRequires:  libassuan-devel
BuildRequires:  glib2-devel
BuildRequires:  libgpgme-devel
BuildRequires:  libseccomp-devel
BuildRequires:  libdevice-mapper-devel
BuildRequires:  golang
BuildRequires:  make
BuildRequires:  git

Requires:       containers-common
Requires:       runc
Requires:       cni-plugins

%undefine _annotated_build
%define debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
mkdir _build
pushd _build
mkdir -p src/github.com/containers
ln -s $(dirs +1 -l) src/github.com/containers/buildah
popd

mv vendor src
export GOPATH=$PWD/_build:$PWD
export BUILDTAGS='seccomp selinux exclude_graphdriver_btrfs'

go build -buildmode pie -compiler gc -tags="$BUILDTAGS" -o bin/buildah github.com/containers/buildah/cmd/buildah
go build -buildmode pie -compiler gc -tags="$BUILDTAGS" -o bin/imgtype github.com/containers/buildah/tests/imgtype

%install
export GOPATH=$PWD/_build:$PWD

%{__install} -D -m0755 bin/buildah %{buildroot}%{_bindir}/buildah
%{__install} -m 644 -D contrib/completions/bash/buildah %{buildroot}%{_datadir}/bash-completion/completions/buildah
cp bin/imgtype %{buildroot}/%{_bindir}/%{name}-imgtype

%files
%license LICENSE
%{_bindir}/buildah
%{_bindir}/buildah-imgtype
%{_datadir}/bash-completion/completions/*
%doc README.md

%changelog

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 1.18.0-1
  Updated to version 1.18.0.
