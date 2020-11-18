Name:           digitalis-rpm-macros
Version:        1
Release:        1%{?dist}
Summary:        Digitalis-specific RPM configuration.
License:        0BSD

BuildArch:      noarch

Source0:        rpm-01-digitalis-macros

# X10-Update-Spec: { "type": "none" }

%description

%prep

%build

%install

install -dm755 %{buildroot}/%{_prefix}/lib/rpm/macros.d
install -m644 %{SOURCE0} %{buildroot}/%{_prefix}/lib/rpm/macros.d/macros.digitalis

%files
%{_prefix}/lib/rpm/macros.d/macros.digitalis

%changelog

