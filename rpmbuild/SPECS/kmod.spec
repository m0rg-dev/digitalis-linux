Name:           kmod
Version:        27
Release:        1%{?dist}
Summary:        Kernel module management tools

License:        GPLv2+
URL:            https://www.kernel.org/pub/linux/utils/kernel/kmod/
%undefine       _disable_source_fetch
Source0:        https://mirrors.edge.kernel.org/pub/linux/utils/kernel/kmod/%{name}-%{version}.tar.xz
%define         SHA256SUM0 c1d3fbf16ca24b95f334c1de1b46f17bbe5a10b0e81e72668bdc922ebffbbc0c

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  %{?host_tool_prefix}liblzma-devel
BuildRequires:  %{?host_tool_prefix}zlib-devel

BuildRequires:  make

Requires:       libkmod%{?_isa} = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n libkmod
Summary:        Kernel module management library
License:        GPLv2+

%description -n libkmod

%package     -n libkmod-devel
Summary:        Development files for libkmod
Requires:       libkmod%{?_isa} = %{version}-%{release}

%description -n libkmod-devel
The libkmod-devel package contains libraries and header files for
developing applications that use libkmod.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --libdir=%{_prefix}/lib --with-xz --with-zlib
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

%files -n libkmod
%license COPYING
%{_prefix}/lib/*.so.*

%files -n libkmod-devel
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc

%changelog
