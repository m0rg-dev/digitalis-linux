Name:           rsync
Version:        3.2.3
Release:        1%{?dist}
Summary:        Fast incremental file transfer

License:        GPLv3
URL:            https://rsync.samba.org/
%undefine       _disable_source_fetch
Source0:        https://download.samba.org/pub/rsync/src/rsync-%{version}.tar.gz
%define         SHA256SUM0 becc3c504ceea499f4167a260040ccf4d9f2ef9499ad5683c179a697146ce50e

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}libopenssl-devel
BuildRequires:  %{?host_tool_prefix}libzstd-devel
BuildRequires:  make

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup

%build
%configure --disable-xxhash --disable-lz4
%make_build

%install
%make_install

%files
%license COPYING
%{_bindir}/rsync
%{_bindir}/rsync-ssl
%doc %{_mandir}/man{1,5}/*

%changelog
