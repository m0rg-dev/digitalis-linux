# If host == target, we aren't building cross tools.
# We should install into /usr and package headers.
%if "%{_host}" == "%{_target}"
%define isnative 1
%else
# Otherwise, we are building a cross tool, to be installed into a sysroot at
# /usr/arch-vendor-os-abi/.
%define isnative 0
%define cross %{_target}-
%define _prefix /usr/%{_target}/usr
%endif

%define libname pcre2

Name:           %{?cross}lib%{libname}
Version:        10.35
Release:        1%{?dist}
Summary:        Perl Compatible Regular Expressions

License:        BSD
URL:            https://pcre.org
%undefine       _disable_source_fetch
Source0:        https://ftp.pcre.org/pub/pcre/%{libname}-%{version}.tar.bz2
%define         SHA256SUM0 9ccba8e02b0ce78046cdfb52e5c177f0f445e421059e43becca4359c669d4613

# X10-Update-Spec: { "type": "webscrape", "url": "https://ftp.pcre.org/pub/pcre/"}

BuildRequires:  make

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

%package     -n %{?cross}pcre2
Summary:        Command-line utilities for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description -n %{?cross}pcre2

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n %{libname}-%{version}

%build

mkdir build
cd build
%define _configure ../configure
%configure --host=%{_target} --libdir=%{_prefix}/lib --disable-static
%make_build

%install
cd build
%make_install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%license LICENCE
%{_prefix}/lib/*.so.*

%files devel
%{_bindir}/pcre2-config
%{_includedir}/*
%{_prefix}/lib/*.so
%{_prefix}/lib/pkgconfig/*.pc
%doc %{_datadir}/doc/pcre2
%doc %{_mandir}/man3/*
%doc %{_mandir}/man1/pcre2-config.1*

%files -n %{?cross}pcre2
%{_bindir}/pcre2test
%{_bindir}/pcre2grep
%doc %{_mandir}/man1/pcre2grep.1*
%doc %{_mandir}/man1/pcre2test.1*

%changelog

