# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%global _oldprefix %{_prefix}
# TODO unify target/usr and target/... but later
%define _prefix /usr/%{_target}/usr
%endif

Name:           %{?cross}ncurses
Version:        6.2
Release:        1%{?dist}
Summary:        The ncurses (new curses) library is a free software emulation of curses in System V Release 4.0 (SVr4), and more.

License:        MIT
URL:            https://invisible-island.net/ncurses/
%undefine       _disable_source_fetch
Source0:        https://ftp.gnu.org/gnu/ncurses/ncurses-%{version}.tar.gz
%define         SHA256SUM0 30306e0c76e0f9f1f0de987cf1c82a5c21e1ce6568b9227f7da5b71cbea86c9d

BuildRequires:  make

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif
BuildRequires:  %{?host_tool_prefix}gcc %{?host_tool_prefix}glibc-devel %{?host_tool_prefix}libstdc++-devel

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc %{?target_tool_prefix}glibc-devel %{?target_tool_prefix}libstdc++-devel

# we're going to build some transitory build-side tools
BuildRequires:  gcc

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n ncurses-%{version}

sed -i s/mawk// configure

%build

mkdir build
cd build
../configure
make -C include
make -C progs tic
cd ..

%configure \
    --libdir=%{_prefix}/lib            \
    --with-manpage-format=normal \
    --with-shared                \
    --without-debug              \
    --without-ada                \
    --without-normal             \
    --enable-widec
%make_build

%install

%{__make} install DESTDIR=%{buildroot}/ INSTALL="%{__install} -p" TIC_PATH=$(pwd)/build/progs/tic
%{__install} -dm755 %{buildroot}/%{_prefix}/lib
echo "INPUT(-lncursesw)" >%{buildroot}/%{_prefix}/lib/libncurses.so

find %{buildroot} -name '*.la' -exec rm -f {} ';'


%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig


%files
%license COPYING
%{_bindir}/*
%{_prefix}/lib/*.so.*
# should terminfo be its own package?
# do we need terminfo on cross builds? (does it matter?)
%{_prefix}/lib/terminfo
%{_datadir}/terminfo
%{_datadir}/tabset
%doc %{_mandir}/man1/*
%doc %{_mandir}/man5/*
%doc %{_mandir}/man7/*

%files devel
%{_includedir}/*
%{_prefix}/lib/*.so
%if %{isnative}
%{_prefix}/lib/*.a
%endif
%doc %{_mandir}/man3/*

%changelog

