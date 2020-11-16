Name:           zsh
Version:        5.8
Release:        1%{?dist}
Summary:        The Z shell

License:        MIT, GPLv3+
URL:            https://github.com/zsh-users/zsh
%undefine       _disable_source_fetch
Source0:        https://github.com/zsh-users/zsh/archive/%{name}-%{version}.tar.gz
%define         SHA256SUM0 db6cdfadac8d3d1f85c55c3644620cf5a0f65bf01ca26a58ff06f041bf159a5d

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libncurses-devel
BuildRequires:  /usr/bin/nroff
BuildRequires:  autoconf
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n zsh-zsh-%{version}

%build
./Util/preconfig
%configure --libdir=%{_prefix}/lib --with-tcsetpgrp
%make_build

%install
cd Doc
nroff -man zshbuiltins.1 >help/mantmp
cd ..
%make_install
%find_lang %{name}

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*

%changelog
