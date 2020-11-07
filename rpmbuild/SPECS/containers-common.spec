Name:           containers-common
Version:        2
Release:        1%{?dist}
Summary:        Common files for OCI containers
BuildArch:      noarch

# I'm really not sure where the canonical registries.conf comes from - no packages
# claim it on my Gentoo install and Google is pretty unhelpful. The policy.json
# included here is probably not unique enough to worry about copyright on in the
# first place.
License:        Unknown

BuildRequires:  /usr/bin/cat

%description

%prep

%build

%install

%{__install} -dm755 %{buildroot}%{_sysconfdir}/containers
cat >%{buildroot}%{_sysconfdir}/containers/registries.conf <<EOF
# This is a system-wide configuration file used to
# keep track of registries for various container backends.
# It adheres to TOML format and does not support recursive
# lists of registries.

# The default location for this configuration file is /etc/containers/registries.conf.

# The only valid categories are: 'registries.search', 'registries.insecure',
# and 'registries.block'.

[registries.search]
registries = ['docker.io', 'quay.io', 'registry.fedoraproject.org', 'registry.access.redhat.com']
#registries = ['registry.access.redhat.com']

# If you need to access insecure registries, add the registry's fully-qualified name.
# An insecure registry is one that does not have a valid SSL certificate or only does HTTP.
[registries.insecure]
registries = []


# If you need to block pull access from a registry, uncomment the section below
# and add the registries fully-qualified name.
#
# Docker only
[registries.block]
registries = []
EOF

# Again, just "what it is on my Gentoo box". No idea if this is a reasonable default.
cat >%{buildroot}%{_sysconfdir}/containers/policy.json <<EOF
{
    "default": [
        {
            "type": "insecureAcceptAnything"
        }
    ],
    "transports":
        {
            "docker-daemon":
                {
                    "": [{"type":"insecureAcceptAnything"}]
                }
        }
}
EOF

%files
%{_sysconfdir}/containers
%config %{_sysconfdir}/containers/*

%changelog

- 2020-11-06 Morgan Thomas <m@m0rg.dev> 2 release 1
  Add policy.json.

- 2020-11-06 Morgan Thomas <m@m0rg.dev> 1 release 2
  Don't install an obviously screwed-up conf. Also, should be noarch.
