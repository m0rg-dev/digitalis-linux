Name:           bzip2
Version:        1.0.8
Release:        1%{?dist}
Summary:        bzip2 is a freely available, patent free (see below), high-quality data compressor.

License:        BSD
URL:            https://sourceware.org/bzip2
%undefine       _disable_source_fetch
Source0:        https://sourceware.org/pub/%{name}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 ab5a03176ee106d3f0fa90e381da478ddae405918153cca248e682cd0c4a2269

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}glibc-devel
BuildRequires:  make

Requires:       libbzip2

%undefine _annotated_build

%description

%package     -n libbzip2
Summary:        The library implementing the bzip2 compression engine.
License:        BSD
URL:            https://sourceware.org/bzip2

%description -n libbzip2

%package     -n libbzip2-devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n libbzip2-devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

# TODO this should be a patch, fixes some symlinks
sed -i 's@\(ln -s -f \)$(PREFIX)/bin/@\1@' Makefile

%build
%{__make} %{_make_output_sync} %{?_smp_mflags} -f Makefile-libbz2_so \
    CC=%{?host_tool_prefix}gcc \
    AR=%{?host_tool_prefix}ar \
    RANLIB=%{?host_tool_prefix}ranlib
make clean
%{__make} %{_make_output_sync} %{?_smp_mflags} \
    CC=%{?host_tool_prefix}gcc \
    AR=%{?host_tool_prefix}ar \
    RANLIB=%{?host_tool_prefix}ranlib

%install
%make_install PREFIX=%{buildroot}/usr

# bzip2's make install isn't great...
install -dm755 %{buildroot}/bin
install -dm755 %{buildroot}/lib
install -dm755 %{buildroot}/%{_datadir}

cp -v bzip2-shared %{buildroot}/bin/bzip2
cp -av libbz2.so* %{buildroot}/lib
rm -v %{buildroot}/usr/bin/{bunzip2,bzcat,bzip2}
ln -sv bzip2 %{buildroot}/bin/bunzip2
ln -sv bzip2 %{buildroot}/bin/bzcat
mv %{buildroot}/usr/man %{buildroot}/%{_mandir}

%files
%license LICENSE
%{_bindir}/*
/bin/bunzip2
/bin/bzcat
/bin/bzip2
%doc %{_mandir}/man1/*.gz

%files -n libbzip2
/lib/libbz2.so.*

%files -n libbzip2-devel
%{_prefix}/lib/libbz2.a
%{_includedir}/bzlib.h

%changelog
