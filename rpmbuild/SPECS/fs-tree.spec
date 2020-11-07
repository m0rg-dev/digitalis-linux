Name:           fs-tree
Version:        3
Release:        4%{?dist}
Summary:        The base filesystem tree.
License:        none
BuildArch:      noarch
BuildRequires:  coreutils

%description

%prep

%build

%install
cd %{buildroot}

mkdir -pv {boot,etc/{bash,opt,sysconfig},home,mnt,opt}
mkdir -pv {media/{floppy,cdrom},srv,var}
install -dv -m 0750 root
install -dv -m 1777 tmp var/tmp
mkdir -pv usr/{,local/}{bin,include,lib,sbin,src}
mkdir -pv usr/{,local/}share/{color,dict,doc,info,locale,man}
mkdir -v  usr/{,local/}share/{misc,terminfo,zoneinfo}
mkdir -pv usr/{,local/}share/man/man{1..8}

mkdir -v var/{log,mail,spool,lock,run}
mkdir -v run
mkdir -pv var/{opt,cache,lib/{color,misc,locate},local}

ln -sv /proc/self/mounts etc/mtab

# usrmerge
ln -sv usr/bin bin
ln -sv usr/sbin sbin
ln -sv usr/lib lib
ln -sv usr/libexec libexec

# no multilib
ln -sv lib lib64
ln -sv lib usr/lib64

# root pw is 'digitalis'
cat > etc/passwd << "EOF"
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/dev/null:/bin/false
daemon:x:6:6:Daemon User:/dev/null:/bin/false
messagebus:x:18:18:D-Bus Message Daemon User:/var/run/dbus:/bin/false
nobody:x:99:99:Unprivileged User:/dev/null:/bin/false
EOF

cat > etc/group << "EOF"
root:x:0:
bin:x:1:daemon
sys:x:2:
kmem:x:3:
tape:x:4:
tty:x:5:
daemon:x:6:
floppy:x:7:
disk:x:8:
lp:x:9:
dialout:x:10:
audio:x:11:
video:x:12:
utmp:x:13:
usb:x:14:
cdrom:x:15:
adm:x:16:
messagebus:x:18:
input:x:24:
mail:x:34:
kvm:x:61:
wheel:x:97:
nogroup:x:99:
users:x:999:
EOF

touch var/log/{btmp,lastlog,faillog,wtmp}
#chgrp -v utmp var/log/lastlog
chmod -v 664  var/log/lastlog
chmod -v 600  var/log/btmp
chmod -v 755 .

cat > etc/os-release <<"EOF"
NAME=Digitalis
ID=digitalis
PRETTY_NAME="Digitalis"
ANSI_COLOR="1;35"
HOME_URL="https://github.com/digitalagedragon/digitalis-linux"
SUPPORT_URL="https://github.com/digitalagedragon/digitalis-linux"
BUG_REPORT_URL="https://github.com/digitalagedragon/digitalis-linux"
EOF

cat > etc/hosts <<"EOF"
127.0.0.1   localhost
::1         localhost6 localhost
EOF

cat > etc/profile <<'EOF'
# /etc/profile
# This file will be read by bash (and similar) to set up login shells.

export EDITOR=${EDITOR:-/usr/bin/nano}
export PAGER=${PAGER:-/usr/bin/less}

umask 022

if [ -f /etc/bash/bashrc ]; then
  . /etc/bash/bashrc
fi

EOF

cat > etc/bash/bashrc <<'EOF'
# /etc/bash/bashrc
# This file will be read by bash to set up interactive shells.

if [[ $- != *i* ]]; then
  # this shell isn't actually interactive
  return
fi

shopt -s checkwinsize
shopt -s no_empty_cmd_completion
shopt -s histappend

use_color=false

LS_COLORS=
if [[ -f ~/.dir_colors ]]; then
  eval "$(dircolors -b ~/.dir_colors)"
elif [[ -f /etc/DIR_COLORS ]]; then
  eval "$(dircolors -b /etc/DIR_COLORS)"
else
  eval "$(dircolors -b)"
fi

if [[ -n ${LS_COLORS:+set} ]]; then
  use_color=true
else
  unset LS_COLORS
fi

# Gentoo-style prompts
if ${use_color}; then
  if [[ $EUID == 0 ]] ; then
    PS1='\[\033[1;31m\]\h\[\033[1;34m\] \w \$\[\033[0m\] '
  else
    PS1='\[\033[1;32m\]\h\[\033[1;34m\] \w \$\[\033[0m\] '
  fi

  alias ls='ls --color=auto'
  alias grep='grep --color=auto'
  alias egrep='egrep --color=auto'
  alias fgrep='fgrep --color=auto'
else
  PS1='\u@\h \w \$ '
fi

unset use_color
EOF

%files
/
%config(noreplace) /etc/passwd
%config(noreplace) /etc/group

%changelog

- 2020-11-07 Morgan Thomas <m@m0rg.dev> 3 release 4
  Add /etc/hosts, /etc/profile, /etc/bash/bashrc

- 2020-11-06 Morgan Thomas <m@m0rg.dev> 2 release 1
  Add /etc/os-release, version -> 2
