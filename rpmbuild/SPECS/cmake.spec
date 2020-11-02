Name:           cmake
Version:        3.18.4
Release:        1%{?dist}
Summary:        The cmake build system

License:        BSD-3-Clause
URL:            https://cmake.org
%undefine       _disable_source_fetch
Source0:        https://github.com/Kitware/CMake/releases/download/v%{version}/%{name}-%{version}.tar.gz
%define         SHA256SUM0 597c61358e6a92ecbfad42a9b5321ddd801fc7e7eca08441307c9138382d4f77

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
BuildRequires: %{?host_tool_prefix}cmake-toolchain
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}g++
BuildRequires:  %{?host_tool_prefix}libopenssl-devel
BuildRequires:  make
BuildRequires:  cmake

%undefine _annotated_build
%global debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

sed -i '/"lib64"/s/64//' Modules/GNUInstallDirs.cmake

%build
mkdir build
cd build
cmake -Wno-dev \
%if "%{_build}" != "%{_target}"
    -DCMAKE_TOOLCHAIN_FILE=/usr/%{_target}/cmake_toolchain \
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
