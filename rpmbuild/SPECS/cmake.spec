%define major_version 3.19
%define patch_version 0

Name:           cmake
Version:        %{major_version}.%{patch_version}
Release:        2%{?dist}
Summary:        The cmake build system

License:        BSD-3-Clause
URL:            https://cmake.org
%undefine       _disable_source_fetch
Source0:        https://github.com/Kitware/CMake/releases/download/v%{version}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 fdda688155aa7e72b7c63ef6f559fca4b6c07382ea6dca0beb5f45aececaf493

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

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 3.19.0 release 2
  Provide the cmake%%{major_version} package as well.

- 2020-11-18 Morgan Thomas <m@m0rg.dev> 3.19.0 release 1
  Updated to version 3.19.0.
