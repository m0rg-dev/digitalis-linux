# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

Name:           %{?cross}p11-kit
Version:        0.23.21
Release:        1%{?dist}
Summary:        PKCS11 module management tools

License:        3-clause BSD
URL:            https://github.com/p11-glue/p11-kit
%undefine       _disable_source_fetch
Source0:        https://github.com/p11-glue/p11-kit/releases/download/%{version}/p11-kit-%{version}.tar.xz
%define         SHA256SUM0 f1baa493f05ca0d867f06bcb54cbb5cdb28c756db07207b6e18de18a87b10627

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif

BuildRequires:  %{?target_tool_prefix}gcc
BuildRequires:  %{?target_tool_prefix}pkg-config
BuildRequires:  %{?target_tool_prefix}libtasn1-devel
BuildRequires:  %{?target_tool_prefix}libffi-devel
BuildRequires:  make
BuildRequires:  make-ca

Requires:       make-ca
Requires:       libtasn1
Requires:       %{?cross}libp11-kit%{?_isa} = %{version}-%{release}

%undefine _annotated_build

%description

%package     -n %{?cross}libp11-kit
Summary:        Library interface to p11-kit
License:        3-clause BSD

%description -n %{?cross}libp11-kit

%package     -n %{?cross}libp11-kit-devel
Summary:        Development files for libp11-kit
Requires:       %{?cross}libp11-kit%{?_isa} = %{version}-%{release}

%description -n %{?cross}libp11-kit-devel
The libp11-kit-devel package contains libraries and header files for
developing applications that use libp11-kit.


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n p11-kit-%{version}

sed '20,$ d' -i trust/trust-extract-compat.in
cat >> trust/trust-extract-compat.in << "EOF"
# Copy existing anchor modifications to /etc/ssl/local
/usr/libexec/make-ca/copy-trust-modifications

# Generate a new trust store
/usr/sbin/make-ca -f -g
EOF

%build
%configure --with-trust-paths=%{_sysconfdir}/pki/anchors --libdir=%{_prefix}/lib --host=%{_target}
%make_build

%install
%make_install

%if %{isnative}
cat >/etc/make-ca.conf <<'EOF'
    CERTDATA="certdata.txt"
    PKIDIR="%{buildroot}/etc/pki"
    SSLDIR="%{buildroot}/etc/ssl"
    CERTUTIL="/usr/bin/certutil"
    KEYTOOL="${JAVA_HOME}/bin/keytool"
    MD5SUM="/usr/bin/md5sum"
    OPENSSL="/usr/bin/openssl"
    TRUST="/usr/bin/trust"
    ANCHORDIR="${PKIDIR}/anchors"
    ANCHORLIST="${PKIDIR}/anchors.md5sums"
    BUNDLEDIR="${PKIDIR}/tls/certs"
    CABUNDLE="${BUNDLEDIR}/ca-bundle.crt"
    SMBUNDLE="${BUNDLEDIR}/email-ca-bundle.crt"
    CSBUNDLE="${BUNDLEDIR}/objsign-ca-bundle.crt"
    CERTDIR="${SSLDIR}/certs"
    KEYSTORE="${PKIDIR}/tls/java"
    NSSDB="${PKIDIR}/nssdb"
    LOCALDIR="${SSLDIR}/local"
    DESTDIR=""
    URL="https://hg.mozilla.org/releases/mozilla-release/raw-file/default/security/nss/lib/ckfw/builtins/certdata.txt"
EOF

/usr/sbin/make-ca -f -g

sed -i 's|%{buildroot}|/|g' %{buildroot}%{_sysconfdir}/pki/anchors.md5sums
%endif

ln -sfv /usr/libexec/p11-kit/trust-extract-compat %{buildroot}%{_bindir}/update-ca-certificates
ln -sfv ./pkcs11/p11-kit-trust.so %{buildroot}%{_prefix}/lib/libnssckbi.so

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license COPYING
%{_bindir}/p11-kit
%{_bindir}/trust
%{_bindir}/update-ca-certificates
%doc %{_datadir}/gtk-doc/html/p11-kit

%files -n %{?cross}libp11-kit
%{_prefix}/lib/*.so.*
%{_libexecdir}/p11-kit
%{_datadir}/p11-kit
%{_prefix}/lib/pkcs11
%if %{isnative}
# TODO should these go here
%{_sysconfdir}/pki
%{_sysconfdir}/ssl
%{_sysconfdir}/ssl/certs
%{_sysconfdir}/pkcs11
%else
%exclude %{_sysconfdir}/pkcs11
%endif

%files -n %{?cross}libp11-kit-devel
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%{_includedir}/*
%changelog
