Name:           conmon
Version:        2.0.21
Release:        1%{?dist}
Summary:        OCI container runtime monitor

License:        Apache-2.0
URL:            https://github.com/containers/conmon
%undefine       _disable_source_fetch
Source0:        https://github.com/containers/conmon/archive/v%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 03c357c2ee35317e781111d59c4f3fb34033e77a17a8f4221f2ed6d3bcc10c25

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  %{?host_tool_prefix}glib2-devel
BuildRequires:  make

Requires:       runc

%undefine _annotated_build
%define debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%make_build

%install
PREFIX=%{_prefix} DESTDIR=%{buildroot} make install
%{__install} -dm755 %{buildroot}%{_libexecdir}/crio
%{__install} -dm755 %{buildroot}%{_libexecdir}/podman
ln -s %{_bindir}/conmon %{buildroot}%{_libexecdir}/crio/conmon
ln -s %{_bindir}/conmon %{buildroot}%{_libexecdir}/podman/conmon

%files
%license LICENSE
%{_bindir}/conmon
%{_libexecdir}/crio/conmon
%{_libexecdir}/podman/conmon

%changelog
