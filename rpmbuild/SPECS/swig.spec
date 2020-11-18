Name:           swig
Version:        4.0.2
Release:        1%{?dist}
Summary:        Multi-language bindings generator

License:        GPLv3+, MIT
URL:            http://www.swig.org/
%undefine       _disable_source_fetch
Source0:        https://github.com/swig/%{name}/archive/v%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 b5f43d5f94c57ede694ffe5e805acc5a3a412387d7f97dcf290d06c46335cb0b

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/swig/swig.git", 
# X10-Update-Spec:   "pattern": "^v((?:\\d+\\.?)+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}gcc
BuildRequires:  %{?host_tool_prefix}g++
BuildRequires:  %{?host_tool_prefix}libpcre-devel
BuildRequires:  make
BuildRequires:  autoconf
BuildRequires:  automake
BuildRequires:  bison

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup
./autogen.sh

%build
# swig is one of those silly things that will absolutely bring weird CFLAGS along
# from the build machine
./configure --prefix=%{_prefix} \
    --host=%{_target} \
%if "%{_build}" != "%{_target}"
    --with-pcre-prefix=/usr/%{_target}/usr
%endif

%make_build

%install
%make_install

%files
%license COPYRIGHT LICENSE LICENSE-GPL LICENSE-UNIVERSITIES
%{_bindir}/*
%{_datadir}/swig

%changelog
