Name:           grub
Version:        2.04
Release:        1%{?dist}
Summary:        A Multiboot bootloader

License:        GPLv3+
URL:            https://gnu.org/software/grub
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 e5292496995ad42dabe843a0192cf2a2c502e7ffcc7479398232b10a472df77d

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.gnu.org/gnu/grub/"}

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  make
BuildRequires:  bison
BuildRequires:  flex

%undefine _annotated_build
%global debug_package %{nil}

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --disable-werror --libdir=%{_prefix}/lib
%make_build

%install
%make_install
%find_lang %{name}

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
%{_sbindir}/*
%{_sysconfdir}/grub.d
%{_prefix}/lib/grub
%{_datadir}/grub
%{_sysconfdir}/bash_completion.d/grub
%doc %{_infodir}/*

%changelog
