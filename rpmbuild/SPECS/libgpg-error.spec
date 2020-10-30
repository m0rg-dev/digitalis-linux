# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%global _oldprefix %{_prefix}
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

%define libname libgpg-error

Name:           %{?cross}%{libname}
Version:        1.39
Release:        1%{?dist}
Summary:        Libgpg-error is a small library that originally defined common error values for all GnuPG components.

License:        LGPLv2+
URL:            https://gnupg.org/software/libgpg-error/index.html
%undefine       _disable_source_fetch
Source0:        https://gnupg.org/ftp/gcrypt/%{libname}/%{libname}-%{version}.tar.bz2
%define         SHA256SUM0 4a836edcae592094ef1c5a4834908f44986ab2b82e0824a0344b49df8cdb298f

BuildRequires:  make gcc

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

%if "%{_host}" != "%{_target}"
%define target_tool_prefix %{_target}-
%else
%define target_tool_prefix %{?host_tool_prefix}
%endif
BuildRequires: %{?target_tool_prefix}gcc

%undefine _annotated_build
%global debug_package %{nil}

%description

%package        devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description    devel
The %{name}-devel package contains libraries and header files for
developing applications that use %{name}.

%package     -n %{?cross}gpg-error
Summary:        Utility programs for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}gpg-error


%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

mkdir build
cd build
%define _configure ../configure
%configure --host=%{_target} \
    --libdir=%{_prefix}/lib \
    --program-prefix=%{?cross} \
    --bindir=%{_oldprefix}/bin

%make_build

%install
cd build
%make_install
%find_lang %{libname}

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%if ! %{isnative}
install -dm755 %{buildroot}/%{_prefix}/bin
ln -sv %{_oldprefix}/bin/%{?cross}gpg-error-config %{buildroot}/%{_prefix}/bin/gpg-error-config
ln -sv %{_oldprefix}/bin/%{?cross}gpgrt-config %{buildroot}/%{_prefix}/bin/gpgrt-config
%endif

%files -f build/%{libname}.lang
%license COPYING COPYING.LIB
%{_prefix}/lib/*.so.*

%doc %{_infodir}/*.info*
%doc %{_mandir}/man1/*
%doc %{_datadir}/%{libname}/errorref.txt

%files devel
%{_includedir}/*
%{_oldprefix}/bin/%{?cross}gpg-error-config
%{_oldprefix}/bin/%{?cross}gpgrt-config
%if ! %{isnative}
%{_prefix}/bin/gpg-error-config
%{_prefix}/bin/gpgrt-config
%endif
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%{_datadir}/aclocal/*.m4
%{_datadir}/common-lisp/source/gpg-error

%files -n %{?cross}gpg-error
%{_oldprefix}/bin/%{?cross}gpg-error
%{_oldprefix}/bin/%{?cross}yat2m

%changelog

