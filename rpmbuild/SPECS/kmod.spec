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

Name:           %{?cross}kmod
Version:        27
Release:        1%{?dist}
Summary:        Kernel module management tools

License:        GPLv2+
URL:            https://www.kernel.org/pub/linux/utils/kernel/kmod/
%undefine       _disable_source_fetch
Source0:        https://mirrors.edge.kernel.org/pub/linux/utils/kernel/kmod/kmod-%{version}.tar.xz
%define         SHA256SUM0 c1d3fbf16ca24b95f334c1de1b46f17bbe5a10b0e81e72668bdc922ebffbbc0c

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif

BuildRequires:  %{?target_tool_prefix}gcc
BuildRequires:  %{?target_tool_prefix}pkg-config
BuildRequires:  %{?target_tool_prefix}liblzma-devel
BuildRequires:  %{?target_tool_prefix}zlib-devel

BuildRequires:  make

Requires:       %{?cross}libkmod%{?_isa} = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n %{?cross}libkmod
Summary:        Kernel module management library
License:        GPLv2+

%description -n %{?cross}libkmod

%package     -n %{?cross}libkmod-devel
Summary:        Development files for libkmod
Requires:       %{?cross}libkmod%{?_isa} = %{version}-%{release}

%description -n %{?cross}libkmod-devel
The libkmod-devel package contains libraries and header files for
developing applications that use libkmod.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n kmod-%{version}

%build
%configure --host=%{_target} --libdir=%{_prefix}/lib --with-xz --with-zlib
%make_build

%install
%make_install

%{__install} -dm755 %{buildroot}%{_sbindir}
for target in depmod insmod lsmod modinfo modprobe rmmod; do
    ln -sfv ../bin/kmod %{buildroot}%{_sbindir}/$target
done

ln -sfv kmod %{buildroot}%{_bindir}/lsmod

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_bindir}/*
%{_sbindir}/*
%{_datadir}/bash-completion/completions/kmod
%doc %{_mandir}/man{5,8}/*

%files -n %{?cross}libkmod
%license COPYING
%{_prefix}/lib/*.so.*

%files -n %{?cross}libkmod-devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc

%changelog
