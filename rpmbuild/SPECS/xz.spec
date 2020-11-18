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

Name:           %{?cross}xz
Version:        5.2.5
Release:        1%{?dist}
Summary:        XZ Utils is free general-purpose data compression software with a high compression ratio.

License:        GPLv2+
URL:            https://tukaani.org/xz/
%undefine       _disable_source_fetch
Source0:        https://tukaani.org/xz/xz-%{version}.tar.xz
%define         SHA256SUM0 3e1e518ffc912f86608a8cb35e4bd41ad1aec210df2a47aaa1f95e7f5576ef56

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://git.tukaani.org/xz.git", 
# X10-Update-Spec:   "pattern": "^v((?:\\d+\\.?)+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif

BuildRequires:  %{?target_tool_prefix}gcc
BuildRequires:  make

Requires: %{?cross}liblzma

%undefine _annotated_build

%description

%package     -n %{?cross}liblzma
Summary:        Libraries for LZMA compression and decompression.
License:        GPLv2+
URL:            https://tukaani.org/xz/

%description -n %{?cross}liblzma

%package     -n %{?cross}liblzma-devel
Summary:        Development files for liblzma
Requires:       %{?cross}liblzma%{?_isa} = %{version}-%{release}

%description -n %{?cross}liblzma-devel

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n xz-%{version}

%build
%configure --libdir=%{_prefix}/lib --host=%{_target} --disable-static
%make_build

%install
%make_install
%find_lang xz
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files -f xz.lang
%license COPYING
%{_bindir}/*
%doc %{_mandir}/man1/*
%doc %{_mandir}/de/man1/*
%doc %{_datadir}/doc/xz

%files -n %{?cross}liblzma
%{_prefix}/lib/*.so.*
%{_prefix}/lib/pkgconfig/liblzma.pc

%files -n %{?cross}liblzma-devel
%{_prefix}/lib/*.so
%{_includedir}/lzma.h
%{_includedir}/lzma/

%changelog
