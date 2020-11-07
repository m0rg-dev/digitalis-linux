Name:           runc
Version:        1.0.0
%define         runc_rcver rc92
Release:        %{runc_rcver}%{?dist}
Summary:        OCI container runner

License:        Apache-2.0
URL:            https://github.com/opencontainers/runc
%undefine       _disable_source_fetch
Source0:        https://github.com/opencontainers/runc/releases/download/v%{version}-%{runc_rcver}/runc.tar.xz#/runc-%{version}-%{runc_rcver}.tar.xz
%define         SHA256SUM0 2f76b623b550588db98e2be72e74aae426f5d4cf736bd92afb91dd5586816daf

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}libseccomp-devel
BuildRequires:  golang
BuildRequires:  make

%undefine _annotated_build
%define debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n runc-%{version}-%{runc_rcver}

%build
%make_build

%install
%{__install} -dm755 %{buildroot}%{_bindir}
cp runc %{buildroot}%{_bindir}

%files
%license LICENSE
%{_bindir}/runc

%changelog
