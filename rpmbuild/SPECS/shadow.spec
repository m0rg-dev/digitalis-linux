Name:           shadow
Version:        4.8.1
Release:        1%{?dist}
Summary:        User management tools

License:        3-clause BSD
URL:            https://github.com/shadow-maint/shadow
%undefine       _disable_source_fetch
Source0:        https://github.com/shadow-maint/shadow/releases/download/%{version}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 a3ad4630bdc41372f02a647278a8c3514844295d36eefe68ece6c3a641c1ae62

Source1:        shadow-01-pam-login
Source2:        shadow-02-pam-passwd
Source3:        shadow-03-pam-su
Source4:        shadow-04-pam-chage

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

# TODO this should be a patch
sed -i 's/groups$(EXEEXT) //' src/Makefile.in
find man -name Makefile.in -exec sed -i 's/groups\.1 / /'   {} \;
find man -name Makefile.in -exec sed -i 's/getspnam\.3 / /' {} \;
find man -name Makefile.in -exec sed -i 's/passwd\.5 / /'   {} \;

sed -i -e 's@#ENCRYPT_METHOD DES@ENCRYPT_METHOD SHA512@' \
    -e 's@/var/spool/mail@/var/mail@' etc/login.defs
sed -i 's/1000/999/' etc/useradd

%build
%configure --with-group-name-max-length=32 --host=%{_target}
%make_build

%install
%make_install

sed -i 's/#FORCE_SHADOW/FORCE_SHADOW/' %{buildroot}/etc/login.defs

%{__install} -dm755 %{buildroot}%{_sysconfdir}/pam.d
%{__install} -m644 %SOURCE1 %{buildroot}%{_sysconfdir}/pam.d/login
%{__install} -m644 %SOURCE2 %{buildroot}%{_sysconfdir}/pam.d/passwd
%{__install} -m644 %SOURCE3 %{buildroot}%{_sysconfdir}/pam.d/su
%{__install} -m644 %SOURCE4 %{buildroot}%{_sysconfdir}/pam.d/chage

for PROGRAM in chfn chgpasswd chpasswd chsh groupadd groupdel \
               groupmems groupmod newusers useradd userdel usermod
do
    %{__install} -m644 %SOURCE4 %{buildroot}%{_sysconfdir}/pam.d/$PROGRAM
    sed -i "s/chage/$PROGRAM/g" %{buildroot}%{_sysconfdir}/pam.d/$PROGRAM
done

%find_lang %{name}

%post
pwconv
grpconv

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%{_sbindir}/*
%{_sysconfdir}/pam.d/*
%config %{_sysconfdir}/default/useradd
%config %{_sysconfdir}/limits
%config %{_sysconfdir}/login.access
%config %{_sysconfdir}/login.defs
%doc %{_mandir}/man{1,3,5,8}/*
%doc %{_mandir}/*/man{1,3,5,8}/*

%changelog
