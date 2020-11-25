%define major_version 3.19
%define patch_version 1

Name:           cmake
Version:        %{major_version}.%{patch_version}
Release:        2%{?dist}
Summary:        The cmake build system

License:        BSD-3-Clause
URL:            https://cmake.org
%undefine       _disable_source_fetch
Source0:        https://github.com/Kitware/CMake/releases/download/v%{version}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 1d266ea3a76ef650cdcf16c782a317cb4a7aa461617ee941e389cb48738a3aba

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/Kitware/CMake.git", 
# X10-Update-Spec:   "pattern": "^v(\\d+\\.\\d+\\.\\d+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
BuildRequires: %{?host_tool_prefix}cmake-toolchain
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}g++
%if %{defined _fedora_dependencies}
BuildRequires:  openssl-devel
BuildRequires:  ncurses-devel
%else
BuildRequires:  %{?host_tool_prefix}libopenssl-devel
BuildRequires:  %{?host_tool_prefix}libncurses-devel
%endif
BuildRequires:  make
BuildRequires:  cmake

%undefine _annotated_build
%global debug_package %{nil}

Provides: cmake%{major_version} = %{version}-%{release}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

sed -i '/"lib64"/s/64//' Modules/GNUInstallDirs.cmake

%build
mkdir build
cd build

cat >xc-cache-hack <<EOF
set( CMake_RUN_CXX_FILESYSTEM
     "ON"
     CACHE STRING "Result from TRY_RUN" FORCE)

set( CMake_RUN_CXX_FILESYSTEM__TRYRUN_OUTPUT
     ""
     CACHE STRING "Output from TRY_RUN" FORCE)
EOF

cmake -Wno-dev \
%if "%{_build}" != "%{_host}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_host}/cmake_toolchain \
    -Cxc-cache-hack \
%endif
    -DCMAKE_INSTALL_PREFIX=%{_prefix} ..

%make_build

%install
cd build
%make_install

mv %{buildroot}%{_prefix}/doc/cmake-%(echo %{version} | sed 's/\.[0-9]\+$//')/* %{buildroot}%{_datadir}/cmake-%(echo %{version} | sed 's/\.[0-9]\+$//')/

%files
%license Copyright.txt
%{_bindir}/*

%{_datadir}/cmake-%(echo %{version} | sed 's/\.[0-9]\+$//')/

%{_datadir}/aclocal/cmake.m4
%{_datadir}/bash-completion/completions/*
%{_datadir}/emacs/site-lisp/cmake-mode.el
%{_datadir}/vim/vimfiles/{indent,syntax}/cmake.vim

%changelog

* Tue Nov 24 2020 Morgan Thomas <m@m0rg.dev> 3.19.1-2
  Updated to version 3.19.1.

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 3.19.0-2
  Provide the cmake%%{major_version} package as well.

* Wed Nov 18 2020 Morgan Thomas <m@m0rg.dev> 3.19.0-1
  Updated to version 3.19.0.
