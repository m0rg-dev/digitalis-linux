Name:           coreutils
Version:        8.32
Release:        1%{?dist}
Summary:        The GNU Core Utilities are the basic file, shell and text manipulation utilities of the GNU operating system.

License:        GPLv3+
URL:            https://www.gnu.org/software/coreutils
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 4458d8de7849df44ccab15e16b1548b285224dbba5f08fac070c1c0e0bcc4cfa

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/coreutils/"}

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

%build
# coreutils' ./configure is too clever for its own good
export FORCE_UNSAFE_CONFIGURE=1
%configure --enable-install-program=hostname --enable-no-install-program=kill,uptime
%make_build

%install
%make_install
%find_lang %{name}

rm -f %{buildroot}%{_infodir}/dir

%files -f %{name}.lang
%license COPYING
%{_bindir}/[
%{_bindir}/b2sum
%{_bindir}/base32
%{_bindir}/base64
%{_bindir}/basename
%{_bindir}/basenc
%{_bindir}/cat
%{_bindir}/chcon
%{_bindir}/chgrp
%{_bindir}/chmod
%{_bindir}/chown
%{_bindir}/chroot
%{_bindir}/cksum
%{_bindir}/comm
%{_bindir}/cp
%{_bindir}/csplit
%{_bindir}/cut
%{_bindir}/date
%{_bindir}/dd
%{_bindir}/df
%{_bindir}/dir
%{_bindir}/dircolors
%{_bindir}/dirname
%{_bindir}/du
%{_bindir}/echo
%{_bindir}/env
%{_bindir}/expand
%{_bindir}/expr
%{_bindir}/factor
%{_bindir}/false
%{_bindir}/fmt
%{_bindir}/fold
%{_bindir}/groups
%{_bindir}/head
%{_bindir}/hostid
%{_bindir}/hostname
%{_bindir}/id
%{_bindir}/install
%{_bindir}/join
%{_bindir}/link
%{_bindir}/ln
%{_bindir}/logname
%{_bindir}/ls
%{_bindir}/md5sum
%{_bindir}/mkdir
%{_bindir}/mkfifo
%{_bindir}/mknod
%{_bindir}/mktemp
%{_bindir}/mv
%{_bindir}/nice
%{_bindir}/nl
%{_bindir}/nohup
%{_bindir}/nproc
%{_bindir}/numfmt
%{_bindir}/od
%{_bindir}/paste
%{_bindir}/pathchk
%{_bindir}/pinky
%{_bindir}/pr
%{_bindir}/printenv
%{_bindir}/printf
%{_bindir}/ptx
%{_bindir}/pwd
%{_bindir}/readlink
%{_bindir}/realpath
%{_bindir}/rm
%{_bindir}/rmdir
%{_bindir}/runcon
%{_bindir}/seq
%{_bindir}/sha1sum
%{_bindir}/sha224sum
%{_bindir}/sha256sum
%{_bindir}/sha384sum
%{_bindir}/sha512sum
%{_bindir}/shred
%{_bindir}/shuf
%{_bindir}/sleep
%{_bindir}/sort
%{_bindir}/split
%{_bindir}/stat
%{_bindir}/stdbuf
%{_bindir}/stty
%{_bindir}/sum
%{_bindir}/sync
%{_bindir}/tac
%{_bindir}/tail
%{_bindir}/tee
%{_bindir}/test
%{_bindir}/timeout
%{_bindir}/touch
%{_bindir}/tr
%{_bindir}/true
%{_bindir}/truncate
%{_bindir}/tsort
%{_bindir}/tty
%{_bindir}/uname
%{_bindir}/unexpand
%{_bindir}/uniq
%{_bindir}/unlink
%{_bindir}/users
%{_bindir}/vdir
%{_bindir}/wc
%{_bindir}/who
%{_bindir}/whoami
%{_bindir}/yes
%{_libexecdir}/%{name}/*.so
%doc %{_infodir}/*.info*.gz
%doc %{_mandir}/man1/*.gz

%changelog
