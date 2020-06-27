# This file adapted from https://github.com/void-linux/void-packages/blob/master/srcpkgs/tzdata/template,
# available under the public domain

export VERSION=2020a

export SRC=tzdata$VERSION.tar.gz
export SRC_URL=http://www.iana.org/time-zones/repository/releases/tzdata$VERSION.tar.gz

pkg_build() {
    mkdir tzdata$VERSION
    cd tzdata$VERSION
    tar xfz ../$SRC
    rm ../$SRC

    timezones="africa antarctica asia australasia europe northamerica \
	southamerica pacificnew etcetera backward systemv factory"

    mkdir -p ../usr/share/zoneinfo/{posix,right}

	zic -y ./yearistype -d ../usr/share/zoneinfo ${timezones}
	zic -y ./yearistype -d ../usr/share/zoneinfo/posix ${timezones}
	zic -y ./yearistype -d ../usr/share/zoneinfo/right -L leapseconds ${timezones}

	zic -y ./yearistype -d ../usr/share/zoneinfo -p America/New_York
	install -m444 -t ../usr/share/zoneinfo iso3166.tab zone1970.tab zone.tab

    cd ..
    rm -r tzdata$VERSION
}