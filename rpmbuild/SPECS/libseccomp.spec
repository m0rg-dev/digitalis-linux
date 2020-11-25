# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

%define libname libseccomp

Name:           %{?cross}%{libname}
Version:        2.5.1
Release:        1%{?dist}
Summary:        Interface to Linux's syscall filtering system

License:        LGPLv2+
URL:            https://github.com/seccomp/libseccomp
%undefine       _disable_source_fetch
Source0:        https://github.com/seccomp/libseccomp/releases/download/v%{version}/libseccomp-%{version}.tar.gz
%define         SHA256SUM0 ee307e383c77aa7995abc5ada544d51c9723ae399768a97667d4cdb3c3a30d55

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/seccomp/libseccomp.git", 
# X10-Update-Spec:   "pattern": "^v((?:\\d+\\.?)+)$" }

BuildRequires:  make

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

mkdir build
cd build
%define _configure ../configure
%configure --host=%{_target} --libdir=%{_prefix}/lib --disable-static
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license LICENSE
%{_prefix}/lib/*.so.*

%files devel
%{_bindir}/*
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%doc %{_mandir}/man{1,3}/*

%changelog

* Tue Nov 24 2020 Morgan Thomas <m@m0rg.dev> 2.5.1-1
  Updated to version 2.5.1.

