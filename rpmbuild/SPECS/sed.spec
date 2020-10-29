Name:           sed
Version:        4.8
Release:        1%{?dist}
Summary:        sed (stream editor) is a non-interactive command-line text editor. 

License:        GPLv3+
URL:            https://www.gnu.org/software/sed
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/%{name}/%{name}-%{version}.tar.xz
%define         SHA256SUM0 f79b0cfea71b37a8eeec8490db6c5f7ae7719c35587f21edb0617f370eeff633

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}glibc-devel
BuildRequires:  make

%undefine _annotated_build
%global _bindir %{_prefix}/../bin

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure
%make_build

%install
%make_install
install -dm755 %{buildroot}/usr/bin
ln -s %{_bindir}/sed %{buildroot}/usr/bin/sed

%find_lang %{name}

%files -f %{name}.lang
%license COPYING
%{_bindir}/*
/usr/bin/sed
%doc %{_infodir}/*.info*.gz
%doc %{_mandir}/man1/*.gz

%changelog
