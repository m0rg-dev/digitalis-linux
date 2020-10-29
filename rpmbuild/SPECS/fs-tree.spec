Name:           fs-tree
Version:        1.0.1
Release:        1%{?dist}
Summary:        The base filesystem tree.
License:        none
BuildArch:      noarch
BuildRequires:  coreutils

%description

%prep

%build

%install
cd %{buildroot}

mkdir -pv {boot,etc/{opt,sysconfig},home,mnt,opt}
mkdir -pv {media/{floppy,cdrom},srv,var}
install -dv -m 0750 root
install -dv -m 1777 tmp var/tmp
mkdir -pv usr/{,local/}{bin,include,lib,sbin,src}
mkdir -pv usr/{,local/}share/{color,dict,doc,info,locale,man}
mkdir -v  usr/{,local/}share/{misc,terminfo,zoneinfo}
mkdir -pv usr/{,local/}share/man/man{1..8}

mkdir -v var/{log,mail,spool}
ln -sv run /var/run
ln -sv run/lock /var/lock
mkdir -pv var/{opt,cache,lib/{color,misc,locate},local}

ln -sv /proc/self/mounts etc/mtab

# usrmerge
ln -sv usr/bin bin
ln -sv usr/sbin sbin
ln -sv usr/lib lib

# no multilib
ln -sv lib lib64
ln -sv lib usr/lib64

# root pw is 'digitalis'
cat > etc/passwd << "EOF"
root:$6$sBFCR/KcG9c/$OOz3BE31qYZEuYgcCVRpmRfYXzYVk8ta7/yI.WteeWscePD36mtyQh37zQ/Ga08VzVpMlWMkp/5fGi2bjl8nJ1:0:0:root:/root:/bin/zsh
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

%files
/
%config(noreplace) /etc/passwd
%config(noreplace) /etc/group

%changelog
