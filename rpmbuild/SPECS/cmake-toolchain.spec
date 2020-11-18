%if ! %{defined _target}
%error Need a _target
%endif

Name:           %{_target}-cmake-toolchain
Version:        1.0
Release:        1%{?dist}
Summary:        Information for cmake about cross-compilers.
License:        None
BuildArch:      noarch

# X10-Update-Spec: { "type": "none" }

# random dependency to not screw up fedora_bootstrap.sh (FIXME)
BuildRequires:  /usr/bin/cat

Provides:       %{_target}-cmake-toolchain

%description

%prep

%build

%install

install -dm755 %{buildroot}/usr/%{_target}/
# TODO processor
cat >%{buildroot}/usr/%{_target}/cmake_toolchain <<EOF
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR %(echo %{_target}|sed "s/-.*//"))

set(CMAKE_SYSROOT /usr/%{_target})

set(ENV{PKG_CONFIG_DIR} "")
set(ENV{PKG_CONFIG_LIBDIR} "\${CMAKE_SYSROOT}/usr/lib/pkgconfig:\${CMAKE_SYSROOT}/usr/share/pkgconfig")
set(ENV{PKG_CONFIG_SYSROOT_DIR} \${CMAKE_SYSROOT})

set(tools /usr/%{_target})
set(CMAKE_C_COMPILER /usr/bin/%{_target}-gcc)
set(CMAKE_CXX_COMPILER /usr/bin/%{_target}-g++)

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
set(CMAKE_FIND_ROOT_PATH "/usr/%{_target}/")
EOF

%files
/usr/%{_target}/cmake_toolchain
