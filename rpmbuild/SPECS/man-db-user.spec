Name:           man-db-user
Summary:        Privilege separation user for man-db
Version:        1
Release:        1%{?dist}
License:        0BSD
BuildArch:      noarch

%description
This gets its own package because man-db needs the user to exist at build time.

%prep

%build

%install

%pre
# Create the 'man' user and group if it doesn't exist
if [ -z "$(getent passwd man)" ]; then
    # TODO this number doesn't mean anything
    useradd man \
        --home-dir /dev/null \
        --uid 13 \
        --system
fi

if [ -z "$(getent group man)" ]; then
    # TODO this number doesn't mean anything
    groupadd man \
        --gid 13 \
        --system
fi

%postun
if [ "$1" = 0 ]; then
    userdel sshd
fi

%files
