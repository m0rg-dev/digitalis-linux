Name:           e2fsprogs
Version:        1.45.6
Release:        1%{?dist}
Summary:        ext2/3/4 utilities

License:        GPLv2
URL:            http://e2fsprogs.sourceforge.net/
%undefine       _disable_source_fetch
Source0:        https://github.com/tytso/e2fsprogs/archive/v%{version}.tar.gz#/e2fsprogs-%{version}.tar.gz
%define         SHA256SUM0 d785164a2977cd88758cb0cac5c29add3fe491562a60040cfb193abcd0f9609b

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/tytso/e2fsprogs.git", 
# X10-Update-Spec:   "pattern": "^v(\\d+\\.\\d+\\.\\d+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}pkg-config
BuildRequires:  %{?host_tool_prefix}libuuid-devel
BuildRequires:  %{?host_tool_prefix}libblkid-devel
BuildRequires:  make

%undefine _annotated_build

%description

%package     -n %{?cross}libext2fs
Summary:        Main ext2/3/4 library
License:        LGPLv2
URL:            http://e2fsprogs.sourceforge.net/
%description -n %{?cross}libext2fs

%package     -n %{?cross}libext2fs-devel
Summary:        Development files for libext2fs
Requires:       %{?cross}libext2fs = %{version}-%{release}
%description -n %{?cross}libext2fs-devel

%package     -n %{?cross}libe2p
Summary:        libe2p from e2fsprogs
License:        LGPLv2
URL:            http://e2fsprogs.sourceforge.net/
%description -n %{?cross}libe2p

%package     -n %{?cross}libe2p-devel
Summary:        Development files for libe2p
Requires:       %{?cross}libe2p = %{version}-%{release}
%description -n %{?cross}libe2p-devel

%package     -n %{?cross}libcom_err
Summary:        libcom_err from e2fsprogs
License:        MIT
URL:            http://e2fsprogs.sourceforge.net/
%description -n %{?cross}libcom_err

%package     -n %{?cross}libcom_err-devel
Summary:        Development files for libcom_err
Requires:       %{?cross}libcom_err = %{version}-%{release}
%description -n %{?cross}libcom_err-devel

%package     -n %{?cross}libss
Summary:        libss from e2fsprogs
License:        MIT
URL:            http://e2fsprogs.sourceforge.net/
%description -n %{?cross}libss

%package     -n %{?cross}libss-devel
Summary:        Development files for libss
Requires:       %{?cross}libss = %{version}-%{release}
%description -n %{?cross}libss-devel

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure \
    --libdir=%{_prefix}/lib \
    --enable-elf-shlibs \
    --disable-libblkid \
    --disable-libuuid \
    --disable-uuidd \
    --disable-fsck \
    --enable-shared

%make_build

%install
%make_install

%find_lang e2fsprogs

find %{buildroot} -name '*.la' -exec rm -f {} ';'
find %{buildroot} -name '*.a' -exec rm -f {} ';'


%files -f e2fsprogs.lang
%license NOTICE
%{_bindir}/{ch,ls}attr
%{_sbindir}/*
%{_prefix}/lib/e2initrd_helper
%config %{_sysconfdir}/*
%doc %{_mandir}/man1/{ch,ls}attr*
%doc %{_mandir}/man{5,8}/*

%files -n libcom_err
%{_prefix}/lib/libcom_err.so.*
%{_datadir}/et

%files -n libcom_err-devel
%{_bindir}/compile_et
%{_prefix}/lib/libcom_err.so
%{_prefix}/lib/pkgconfig/com_err.pc
%{_includedir}/et
%{_includedir}/com_err.h
%doc %{_mandir}/man1/compile_et*
%doc %{_mandir}/man3/com_err*

%files -n libss
%{_prefix}/lib/libss.so.*
%{_datadir}/ss

%files -n libss-devel
%{_bindir}/mk_cmds
%{_prefix}/lib/libss.so
%{_prefix}/lib/pkgconfig/ss.pc
%{_includedir}/ss
%doc %{_mandir}/man1/mk_cmds*

%files -n libext2fs
%{_prefix}/lib/libext2fs.so.*

%files -n libext2fs-devel
%{_prefix}/lib/libext2fs.so
%{_prefix}/lib/pkgconfig/ext2fs.pc
%{_includedir}/ext2fs

%files -n libe2p
%{_prefix}/lib/libe2p.so.*

%files -n libe2p-devel
%{_prefix}/lib/libe2p.so
%{_prefix}/lib/pkgconfig/e2p.pc
%{_includedir}/e2p

%changelog
