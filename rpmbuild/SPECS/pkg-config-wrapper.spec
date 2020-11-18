%if ! %{defined _target}
%error Need a _target
%endif

Name:           %{_target}-pkg-config-wrapper
Version:        1.0
Release:        1%{?dist}
Summary:        A wrapper script to run pkg-config for a cross sysroot.
License:        None
BuildArch:      noarch

# X10-Update-Spec: { "type": "none" }

# random dependency to not screw up fedora_bootstrap.sh (FIXME)
BuildRequires:  /usr/bin/cat

Requires:       pkg-config
Provides:       %{_target}-pkg-config = %{version}-%{release}

%description

%prep

%build

%install

install -dm755 %{buildroot}/%{_bindir}

cat >%{buildroot}/%{_bindir}/%{_target}-pkg-config <<EOF
#!/bin/sh

SYSROOT=/usr/%{_target}/

export PKG_CONFIG_PATH=
export PKG_CONFIG_LIBDIR=\${SYSROOT}/usr/lib/pkgconfig:\${SYSROOT}/usr/share/pkgconfig:\${SYSROOT}/share/pkgconfig
export PKG_CONFIG_SYSROOT_DIR=\${SYSROOT}

exec pkg-config "\$@"
EOF

chmod 755 %{buildroot}/%{_bindir}/%{_target}-pkg-config

%files
%{_bindir}/%{_target}-pkg-config