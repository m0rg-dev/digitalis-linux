Name:           rpm
Version:        4.16.0
Release:        1%{?dist}
Summary:        The RPM Package Manager (RPM) is a powerful package management system.

License:        GPLv2
URL:            https://rpm.org/
%undefine       _disable_source_fetch
Source0:        http://ftp.rpm.org/releases/rpm-4.16.x/%{name}-%{version}.tar.bz2
%define         SHA256SUM0 ca5974e9da2939afb422598818ef187385061889ba766166c4a3829c5ef8d411

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}glibc-devel %{?host_tool_prefix}zlib-devel
BuildRequires:  %{?host_tool_prefix}libgcrypt-devel %{?host_tool_prefix}libmagic-devel %{?host_tool_prefix}popt-devel
BuildRequires:  %{?host_tool_prefix}libarchive-devel %{?host_tool_prefix}sqlite-devel %{?host_tool_prefix}pkg-config
BuildRequires:  %{?host_tool_prefix}liblua-devel
BuildRequires:  make

Requires:       librpm = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n librpm
Summary:        A library for handling RPM packages.
License:        GPLv2
URL:            https://rpm.org/

%description -n librpm

%package     -n librpm-devel
Summary:        Development files for librpm
Requires:       librpm%{?_isa} = %{version}-%{release}

%description -n librpm-devel
The librpm-devel package contains libraries and header files for
developing applications that use librpm.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup
sed -i '1s/python/python3/' scripts/pythondistdeps.py

%build
%configure --libdir=%{_prefix}/lib --enable-bdb=no --enable-sqlite=yes --disable-openmp
%make_build

%install
%make_install
%find_lang %{name}
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files -f %{name}.lang
%license COPYING
# TODO split rpmbuild out
%{_bindir}/*
%doc %{_mandir}/man{1,8}/*.gz
%doc %{_mandir}/*/man{1,8}/*.gz

%files -n librpm
%{_prefix}/lib/*.so.*
%{_prefix}/lib/rpm-plugins
%{_prefix}/lib/rpm

%files -n librpm-devel
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%{_includedir}/rpm

%changelog
