%define system_python 3.9

Name:           createrepo_c
Version:        0.16.2
Release:        2%{?dist}
Summary:        Tool for building yum repos

License:        GPLv2
URL:            https://github.com/rpm-software-management/createrepo_c
%undefine       _disable_source_fetch
Source0:        https://github.com/rpm-software-management/createrepo_c/archive/%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 cbb9650e0e61895284c398dfa1480f0a4907881e467f968fafdba3b06d1c56fa

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/rpm-software-management/createrepo_c.git", 
# X10-Update-Spec:   "pattern": "^(\\d+\\.\\d+\\.\\d+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
BuildRequires:  %{?host_tool_prefix}cmake-toolchain
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libbzip2-devel
BuildRequires:  %{?host_tool_prefix}libmagic-devel
BuildRequires:  %{?host_tool_prefix}glib2-devel
BuildRequires:  %{?host_tool_prefix}libcurl-devel
BuildRequires:  %{?host_tool_prefix}libmodulemd-devel
BuildRequires:  %{?host_tool_prefix}libxml2-devel
BuildRequires:  %{?host_tool_prefix}libpython%{system_python}-devel
BuildRequires:  %{?host_tool_prefix}librpm-devel
BuildRequires:  %{?host_tool_prefix}libopenssl-devel
BuildRequires:  %{?host_tool_prefix}libsqlite-devel
BuildRequires:  %{?host_tool_prefix}liblzma-devel
BuildRequires:  %{?host_tool_prefix}libzchunk-devel
BuildRequires:  %{?host_tool_prefix}zlib-devel
BuildRequires:  %{?host_tool_prefix}pkg-config

BuildRequires:  make
BuildRequires:  cmake

Requires:       libcreaterepo_c

%undefine _annotated_build

%description

%package     -n libcreaterepo_c
Summary:        Library interface to createrepo_c

%description -n libcreaterepo_c

%package     -n libcreaterepo_c-devel
Summary:        Development files for libcreaterepo_c
Requires:       libcreaterepo_c%{?_isa} = %{version}-%{release}

%description -n libcreaterepo_c-devel
The libcreaterepo_c-devel package contains libraries and header files for
developing applications that use libcreaterepo_c.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

sed -i '/unset(PYTHON_EXECUTABLE/d' src/python/CMakeLists.txt

%build
mkdir build
cd build
cmake -Wno-dev \
%if "%{_build}" != "%{_target}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_target}/cmake_toolchain \
%endif
    -DPYTHON_DESIRED=3 \
    -DPYTHON_EXECUTABLE:FILEPATH=/usr/bin/python%{system_python} \
    -DCMAKE_INSTALL_PREFIX=%{_prefix} -DENABLE_DRPM=OFF ..

%make_build

%install
cd build
%make_install

%files
%license COPYING
%{_bindir}/*
%{_prefix}/lib*/python%{system_python}/site-packages/*
%doc %{_mandir}/man8/*

%files -n libcreaterepo_c
%{_prefix}/lib/libcreaterepo_c.so.*

%files -n libcreaterepo_c-devel
%{_prefix}/lib/libcreaterepo_c.so
%{_prefix}/lib/pkgconfig/*.pc
%{_includedir}/*

%changelog

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 0.16.2-2
  Updated to Python 3.9

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 0.16.2-1
  Updated to version 0.16.2.
