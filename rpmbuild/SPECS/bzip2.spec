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

Name:           %{?cross}bzip2
Version:        1.0.8
Release:        1%{?dist}
Summary:        bzip2 is a high-quality data compressor.

License:        BSD
URL:            https://sourceware.org/bzip2
%undefine       _disable_source_fetch
Source0:        https://sourceware.org/pub/bzip2/bzip2-%{version}.tar.gz
%define         SHA256SUM0 ab5a03176ee106d3f0fa90e381da478ddae405918153cca248e682cd0c4a2269

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

Requires:       %{?cross}libbzip2

%undefine _annotated_build

%description

%package     -n %{?cross}libbzip2
Summary:        The library implementing the bzip2 compression engine.
License:        BSD
URL:            https://sourceware.org/bzip2

%description -n %{?cross}libbzip2

%package     -n %{?cross}libbzip2-devel
Summary:        Development files for %{name}
Requires:       %{?cross}libbzip2%{?_isa} = %{version}-%{release}

%description -n %{?cross}libbzip2-devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n bzip2-%{version}

# TODO this should be a patch, fixes some symlinks
sed -i 's@\(ln -s -f \)$(PREFIX)/bin/@\1@' Makefile

%build
%{__make} %{_make_output_sync} %{?_smp_mflags} -f Makefile-libbz2_so \
    CC=%{?target_tool_prefix}gcc \
    AR=%{?target_tool_prefix}ar \
    RANLIB=%{?target_tool_prefix}ranlib
make clean
%{__make} %{_make_output_sync} %{?_smp_mflags} \
    CC=%{?target_tool_prefix}gcc \
    AR=%{?target_tool_prefix}ar \
    RANLIB=%{?target_tool_prefix}ranlib

%install
%if %{isnative}
%make_install PREFIX=%{buildroot}/usr
%else
%make_install PREFIX=%{buildroot}/usr/%{_target}/usr
%endif

# bzip2's make install isn't great...
install -dm755 %{buildroot}/%{_bindir}
install -dm755 %{buildroot}/%{_prefix}/lib
install -dm755 %{buildroot}/%{_datadir}

cp -v bzip2-shared %{buildroot}/%{_bindir}/bzip2
cp -av libbz2.so* %{buildroot}/%{_prefix}/lib
ln -sv libbz2.so.%{version} %{buildroot}/%{_prefix}/lib/libbz2.so

rm -v %{buildroot}/%{_bindir}/{bunzip2,bzcat}
ln -sv bzip2 %{buildroot}/%{_bindir}/bunzip2
ln -sv bzip2 %{buildroot}/%{_bindir}/bzcat
mv %{buildroot}/%{_prefix}/man %{buildroot}/%{_mandir}

%files
%license LICENSE
%{_bindir}/*
%doc %{_mandir}/man1/*

%files -n %{?cross}libbzip2
%{_prefix}/lib/libbz2.so.*

%files -n %{?cross}libbzip2-devel
%exclude %{_prefix}/lib/libbz2.a
%{_includedir}/bzlib.h
%{_prefix}/lib/libbz2.so

%changelog
