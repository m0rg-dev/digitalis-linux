Name:           ninja-build
Version:        1.10.1
Release:        1%{?dist}
Summary:        A small build system with a focus on speed

License:        Apache-2.0
URL:            https://ninja-build.org/
%undefine       _disable_source_fetch
Source0:        https://github.com/ninja-build/ninja/archive/v%{version}.tar.gz#/%{name}-%{version}.tar.gz
%define         SHA256SUM0 a6b6f7ac360d4aabd54e299cc1d8fa7b234cd81b9401693da21221c62569a23e

# X10-Update-Spec: { "type": "git-tags", 
# X10-Update-Spec:   "repo": "https://github.com/ninja-build/ninja.git", 
# X10-Update-Spec:   "pattern": "^v((?:\\d+\\.?)+)$" }

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  %{?host_tool_prefix}g++
BuildRequires:  python
BuildRequires:  make
BuildRequires:  asciidoc

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
%autosetup -n ninja-%{version}

%build
CC=%{?host_tool_prefix}gcc CXX=%{?host_tool_prefix}g++ AR=%{?host_tool_prefix}ar ./configure.py --bootstrap
./ninja manual

%install
%{__install} -dm755 %{buildroot}%{_bindir} %{buildroot}%{_docdir}
%{__install} ninja %{buildroot}%{_bindir}/

%files
%license COPYING
%{_bindir}/ninja
%doc doc/manual.html

%changelog
