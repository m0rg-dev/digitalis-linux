Name:           tzdata
Version:        2020d
Release:        1%{?dist}
Summary:        IANA time zone database

License:        Public domain
URL:            https://www.iana.org/time-zones
%undefine       _disable_source_fetch
Source0:        https://data.iana.org/time-zones/releases/tzdata2020d.tar.gz
%define         SHA256SUM0 8d813957de363387696f05af8a8889afa282ab5016a764c701a20758d39cbaf3

BuildArch:      noarch

%if "%{_build}" != "%{_host}"
%define host_tool_prefix %{_host}-
%endif

BuildRequires:  /usr/sbin/zic

%undefine _annotated_build

%description

%prep
echo "%SHA256SUM0  %SOURCE0" | sha256sum -c -
rm -rf tzdata-%{version}
mkdir tzdata-%{version}
cd tzdata-%{version}
tar xzf %SOURCE0

%build

%install

cd tzdata-%{version}
timezones="africa antarctica asia australasia europe northamerica southamerica etcetera backward factory"
mkdir -p %{buildroot}%{_datadir}/zoneinfo/{posix,right}
zic -y ./yearistype -d %{buildroot}%{_datadir}/zoneinfo ${timezones}
zic -y ./yearistype -d %{buildroot}%{_datadir}/zoneinfo/posix ${timezones}
zic -y ./yearistype -d %{buildroot}%{_datadir}/zoneinfo/right -L leapseconds ${timezones}
zic -y ./yearistype -d %{buildroot}%{_datadir}/zoneinfo -p America/New_York
install -m444 -t %{buildroot}%{_datadir}/zoneinfo iso3166.tab zone1970.tab zone.tab

%files
%license tzdata-%{version}/LICENSE
%{_datadir}/zoneinfo

%changelog
