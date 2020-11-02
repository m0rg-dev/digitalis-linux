# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%global _oldprefix %{_prefix}
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

%define libname libksba

Name:           %{?cross}%{libname}
Version:        1.4.0
Release:        1%{?dist}
Summary:        GPG certificate management library

License:        LGPLv3+, GPLv2+, GPLv3+
URL:            https://www.gnupg.org/
%undefine       _disable_source_fetch
Source0:        https://www.gnupg.org/ftp/gcrypt/%{libname}/%{libname}-%{version}.tar.bz2
%define         SHA256SUM0 bfe6a8e91ff0f54d8a329514db406667000cb207238eded49b599761bfca41b6

BuildRequires:  make gcc

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc 
BuildRequires: %{?target_tool_prefix}libgpg-error-devel %{?target_tool_prefix}pkg-config

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
export SYSROOT=%(%{?target_tool_prefix}gcc -print-sysroot)/usr # needed for libgpg-error config??? someday I'll figure that out
%configure  --host=%{_target} \
    --libdir=%{_prefix}/lib \
    --program-prefix=%{?cross} \
    --bindir=%{_oldprefix}/bin
%make_build

%install
cd build
%make_install

%if ! %{isnative}
install -dm755 %{buildroot}/%{_prefix}/bin
ln -sv %{_oldprefix}/bin/%{?cross}ksba-config %{buildroot}/%{_prefix}/bin/ksba-config
%endif

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING COPYING.GPLv2 COPYING.GPLv3 COPYING.LGPLv3
%{_prefix}/lib/*.so.*
%doc %{_infodir}/*.info*

%files devel
%{_oldprefix}/bin/%{?cross}ksba-config
%if ! %{isnative}
%{_prefix}/bin/ksba-config
%endif
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%{_datadir}/aclocal/*.m4

%changelog

