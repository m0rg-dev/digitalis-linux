%if ! %{defined _target}
%error Need a _target
%endif

Name:           %{_target}-meson-toolchain
Version:        1.0
Release:        1%{?dist}
Summary:        Information for meson about cross-compilers.
License:        None
BuildArch:      noarch

# random dependency to not screw up fedora_bootstrap.sh (FIXME)
BuildRequires:  /bin/cat

Provides:       %{_target}-meson-toolchain
Requires:       %{_target}-pkg-config

%description

%prep

%build

%install

install -dm755 %{buildroot}/%{_datadir}/meson/cross
# TODO processor
cat >%{buildroot}/%{_datadir}/meson/cross/%{_target} <<EOF
[host_machine]
system = 'linux'
cpu_family = '%(echo %{_target}|sed "s/-.*//")'
cpu = '%(echo %{_target}|sed "s/-.*//")'
endian = 'little'

[properties]
c_args = []
c_link_args = []
sys_root = '/usr/%{_target}/'
needs_exe_wrapper = true

[binaries]
c = '%{_target}-gcc'
cpp = '%{_target}-g++'
ar = '%{_target}-ar'
ld = '%{_target}-ld'
objcopy = '%{_target}-objcopy'
strip = '%{_target}-strip'
pkgconfig = '%{_target}-pkg-config'
windres = '%{_target}-windres'
EOF


%files
%{_datadir}/meson/cross/%{_target}
